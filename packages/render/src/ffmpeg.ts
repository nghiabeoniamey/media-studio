import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
export const FFPROBE = process.env.FFPROBE_PATH || "ffprobe";

export interface ExecResult {
  stdout: string;
  stderr: string;
}

/** Run a binary with an argument array (never a shell string). Errors carry the tail of stderr. */
export function run(bin: string, args: string[], opts: { timeoutMs?: number } = {}): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    execFile(
      bin,
      args,
      { maxBuffer: 64 * 1024 * 1024, timeout: opts.timeoutMs ?? 10 * 60_000, encoding: "utf8" },
      (err, stdout, stderr) => {
        if (err) {
          const tail = String(stderr ?? "").trim().split("\n").slice(-8).join("\n");
          reject(new Error(`${bin} failed (${err.code ?? err.signal ?? "error"}): ${tail || err.message}`, { cause: err }));
          return;
        }
        resolve({ stdout: String(stdout), stderr: String(stderr) });
      },
    );
  });
}

export function ffmpeg(args: string[], opts?: { timeoutMs?: number }): Promise<ExecResult> {
  return run(FFMPEG, ["-hide_banner", "-nostdin", "-y", ...args], opts);
}

export interface MediaProbe {
  durationSec: number;
  width: number | null;
  height: number | null;
  hasVideo: boolean;
  hasAudio: boolean;
}

interface FfprobeStream {
  codec_type?: string;
  width?: number;
  height?: number;
  duration?: string;
  disposition?: { attached_pic?: number };
}

export async function probeMedia(path: string): Promise<MediaProbe> {
  const { stdout } = await run(FFPROBE, ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", path]);
  const json = JSON.parse(stdout) as { format?: { duration?: string }; streams?: FfprobeStream[] };
  const streams = json.streams ?? [];
  // Cover art in audio files is a "video" stream flagged attached_pic; it is not video.
  const video = streams.find((s) => s.codec_type === "video" && !s.disposition?.attached_pic);
  const anyPicture = video ?? streams.find((s) => s.codec_type === "video");
  let durationSec = Number(json.format?.duration);
  if (!Number.isFinite(durationSec)) {
    durationSec = Math.max(0, ...streams.map((s) => Number(s.duration)).filter((d) => Number.isFinite(d)));
  }
  return {
    durationSec: Number.isFinite(durationSec) ? durationSec : 0,
    width: anyPicture?.width ?? null,
    height: anyPicture?.height ?? null,
    hasVideo: Boolean(video),
    hasAudio: streams.some((s) => s.codec_type === "audio"),
  };
}

async function assertNonEmpty(path: string, what: string): Promise<void> {
  try {
    const s = await stat(path);
    if (s.size > 0) return;
  } catch {
    // fall through
  }
  throw new Error(what);
}

/** Write one PNG frame at `at` seconds, or the very last decodable frame for "last". */
export async function extractFrame(videoPath: string, at: number | "last", outPath: string): Promise<void> {
  await mkdir(dirname(outPath), { recursive: true });
  await rm(outPath, { force: true });
  if (at === "last") {
    const { durationSec } = await probeMedia(videoPath);
    const seek = Math.max(0, durationSec - 1);
    // Decode the final second and keep overwriting the same image: the survivor is the last frame.
    await ffmpeg(["-ss", seek.toFixed(3), "-i", videoPath, "-an", "-update", "1", "-fps_mode", "passthrough", "-f", "image2", outPath]);
  } else {
    if (!Number.isFinite(at) || at < 0) throw new Error(`extractFrame: invalid time ${at}`);
    await ffmpeg(["-ss", at.toFixed(3), "-i", videoPath, "-an", "-frames:v", "1", "-f", "image2", outPath]);
  }
  await assertNonEmpty(outPath, `extractFrame: no frame at ${at} in ${videoPath}`);
}

const BOLD_FONTS = [
  "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf",
  "/usr/share/fonts/opentype/inter/Inter-Bold.otf",
  "/usr/share/fonts/truetype/inter/Inter-Bold.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
];

/** drawtext font option: an installed bold font file, else let fontconfig pick a bold sans. */
export function thumbnailFontOption(candidates: string[] = BOLD_FONTS): string {
  const env = process.env.RENDER_FONT_FILE;
  const list = env ? [env, ...candidates] : candidates;
  for (const f of list) {
    // Only plain paths go into the filter graph unescaped.
    if (/^[\w./-]+$/.test(f) && existsSync(f)) return `fontfile=${f}`;
  }
  // Escaped twice: once for the filter graph, once for drawtext's own option parser.
  return "font=Sans\\\\:style=Bold";
}

/** Greedy word wrap for thumbnail titles; very long words are kept whole on their own line. */
export function wrapText(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (!line) line = w;
    else if (line.length + 1 + w.length <= maxChars) line += ` ${w}`;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Pick a title size that fits in at most 4 lines across the safe width. */
export function layoutTitle(title: string, width = 1080): { fontSize: number; lines: string[] } {
  const usable = width * 0.84;
  for (let fontSize = 104; fontSize >= 56; fontSize -= 8) {
    const maxChars = Math.max(6, Math.floor(usable / (fontSize * 0.6)));
    const lines = wrapText(title, maxChars);
    if (lines.length <= 4 && lines.every((l) => l.length <= maxChars + 2)) return { fontSize, lines };
  }
  const fontSize = 56;
  return { fontSize, lines: wrapText(title, Math.floor(usable / (fontSize * 0.6))).slice(0, 5) };
}

/** 1080×1920 JPEG cover from an image (or video frame), with an optional bold title on a soft dark gradient. */
export async function makeThumbnail(input: { imagePath: string; outPath: string; title?: string }): Promise<void> {
  const W = 1080;
  const H = 1920;
  await mkdir(dirname(input.outPath), { recursive: true });
  await rm(input.outPath, { force: true });
  const filters = [`scale=${W}:${H}:force_original_aspect_ratio=increase`, `crop=${W}:${H}`, "setsar=1"];
  const title = input.title?.replace(/\s+/g, " ").trim();
  const work = title ? await mkdtemp(join(tmpdir(), "ms-thumb-")) : null;
  try {
    if (title && work) {
      const { fontSize, lines } = layoutTitle(title, W);
      const lineHeight = Math.round(fontSize * 1.16);
      // Centre of the title block sits in the lower-middle, inside the 3:4 grid crop and the 9:16 safe area.
      const blockTop = Math.round(H * 0.63 - (lines.length * lineHeight) / 2);
      for (let i = 0; i < 12; i++) {
        const y = Math.round(H * (0.44 + i * 0.047));
        filters.push(`drawbox=x=0:y=${y}:w=${W}:h=${H - y}:color=black@0.055:t=fill`);
      }
      const font = thumbnailFontOption();
      for (let i = 0; i < lines.length; i++) {
        const file = join(work, `line${i}.txt`);
        await writeFile(file, lines[i]!, "utf8");
        filters.push(
          [
            `drawtext=${font}`,
            `textfile=${file}`,
            "expansion=none",
            `fontsize=${fontSize}`,
            "fontcolor=white",
            `borderw=${Math.max(2, Math.round(fontSize * 0.06))}`,
            "bordercolor=black@0.8",
            "shadowcolor=black@0.45",
            "shadowx=0",
            `shadowy=${Math.round(fontSize * 0.08)}`,
            "x=(w-text_w)/2",
            `y=${blockTop + i * lineHeight}`,
          ].join(":"),
        );
      }
    }
    await ffmpeg(["-i", input.imagePath, "-frames:v", "1", "-vf", filters.join(","), "-q:v", "2", "-f", "image2", input.outPath]);
  } finally {
    if (work) await rm(work, { recursive: true, force: true });
  }
  await assertNonEmpty(input.outPath, `makeThumbnail: no output for ${input.imagePath}`);
}

/** Small, heavily blurred copy of a still for the depth layer (cheaper than a CSS blur on every frame). */
export async function makeDepthImage(imagePath: string, outPath: string): Promise<void> {
  await ffmpeg([
    "-i",
    imagePath,
    "-frames:v",
    "1",
    "-vf",
    "scale=360:640:force_original_aspect_ratio=increase,crop=360:640,gblur=sigma=9,setsar=1",
    "-q:v",
    "3",
    "-f",
    "image2",
    outPath,
  ]);
}

/** 16 kHz mono 16-bit WAV, the input format whisper.cpp requires. */
export async function toWav16k(inputPath: string, outPath: string): Promise<void> {
  await ffmpeg(["-i", inputPath, "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", "-f", "wav", outPath]);
}

export interface Silence {
  startSec: number;
  endSec: number;
}

export function parseSilences(stderr: string, durationSec: number): Silence[] {
  const out: Silence[] = [];
  let open: number | null = null;
  for (const line of stderr.split("\n")) {
    const s = /silence_start:\s*(-?[\d.]+)/.exec(line);
    if (s) {
      open = Math.max(0, Number(s[1]));
      continue;
    }
    const e = /silence_end:\s*([\d.]+)/.exec(line);
    if (e && open !== null) {
      out.push({ startSec: open, endSec: Number(e[1]) });
      open = null;
    }
  }
  if (open !== null) out.push({ startSec: open, endSec: durationSec });
  return out;
}

export async function detectSilences(audioPath: string, durationSec: number, opts: { noiseDb?: number; minSec?: number } = {}): Promise<Silence[]> {
  const { stderr } = await run(FFMPEG, [
    "-hide_banner",
    "-nostdin",
    "-i",
    audioPath,
    "-af",
    `silencedetect=noise=${opts.noiseDb ?? -38}dB:d=${opts.minSec ?? 0.2}`,
    "-f",
    "null",
    "-",
  ]);
  return parseSilences(stderr, durationSec);
}
