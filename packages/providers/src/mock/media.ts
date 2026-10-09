import { estimateWordTimings, type AspectRatio, type VideoResolution, type WordTiming } from "@media-studio/core";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFfmpeg } from "../ffmpeg";
import { floatToWav } from "../media";
import { hash32, hslHex } from "./util";

/** Same pixel sizes Nano Banana returns at 1K, so mock keyframes exercise the real render path. */
export const MOCK_IMAGE_SIZES: Record<AspectRatio, { width: number; height: number }> = {
  "9:16": { width: 768, height: 1376 },
  "16:9": { width: 1376, height: 768 },
  "1:1": { width: 1024, height: 1024 },
  "3:4": { width: 896, height: 1200 },
  "4:3": { width: 1200, height: 896 },
};

const PORTRAIT_VIDEO_SIZES: Record<VideoResolution, { width: number; height: number }> = {
  "480p": { width: 480, height: 854 },
  "720p": { width: 720, height: 1280 },
  "768p": { width: 768, height: 1366 },
  "1080p": { width: 1080, height: 1920 },
};

export function mockVideoSize(resolution: VideoResolution, aspectRatio: "9:16" | "16:9"): { width: number; height: number } {
  const p = PORTRAIT_VIDEO_SIZES[resolution];
  return aspectRatio === "9:16" ? p : { width: p.height, height: p.width };
}

const FONT_CANDIDATES = [
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/opentype/inter/Inter-Regular.otf",
  "/usr/share/fonts/TTF/DejaVuSans.ttf",
  "/System/Library/Fonts/Supplemental/Arial.ttf",
];

function fontFile(): string | null {
  const env = process.env.MOCK_FONT_FILE;
  if (env && existsSync(env)) return env;
  return FONT_CANDIDATES.find((f) => existsSync(f)) ?? null;
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "ms-mock-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Gradient PNG coloured by a hash of the prompt, with a short label (skipped if drawtext is unavailable). */
export async function renderMockImage(args: { prompt: string; aspectRatio: AspectRatio; label: string }): Promise<Uint8Array> {
  const { width, height } = MOCK_IMAGE_SIZES[args.aspectRatio];
  const hue = hash32(args.prompt) % 360;
  const c0 = hslHex(hue, 0.45, 0.28);
  const c1 = hslHex((hue + 45) % 360, 0.55, 0.62);
  const source = `gradients=s=${width}x${height}:c0=0x${c0}:c1=0x${c1}:x0=0:y0=0:x1=${width}:y1=${height}:nb_colors=2:speed=0.00001:rate=1`;
  return withTempDir(async (dir) => {
    const out = join(dir, "image.png");
    const textPath = join(dir, "label.txt");
    // The label goes through a file so prompt text is never interpreted as filter syntax.
    await writeFile(textPath, args.label);
    const font = fontFile();
    const filterSafe = (p: string) => /^[\w/.-]+$/.test(p);
    const fontSize = Math.round(width / 22);
    const drawtext = [
      `drawtext=textfile=${textPath}`,
      "expansion=none",
      ...(font && filterSafe(font) ? [`fontfile=${font}`] : []),
      `fontsize=${fontSize}`,
      "fontcolor=white",
      "box=1",
      "boxcolor=black@0.45",
      `boxborderw=${Math.round(fontSize / 2)}`,
      `line_spacing=${Math.round(fontSize / 3)}`,
      "x=(w-text_w)/2",
      "y=h*0.72",
    ].join(":");
    const base = ["-f", "lavfi", "-i", source];
    try {
      if (!filterSafe(textPath)) throw new Error("temp path is not filter-safe");
      await runFfmpeg([...base, "-vf", drawtext, "-frames:v", "1", out]);
    } catch {
      await runFfmpeg([...base, "-frames:v", "1", out]);
    }
    return new Uint8Array(await readFile(out));
  });
}

/** H.264 yuv420p 24 fps push-in on the first frame, `durationSec` long. */
export async function renderMockClip(args: {
  framePath: string;
  outPath: string;
  durationSec: number;
  resolution: VideoResolution;
  aspectRatio: "9:16" | "16:9";
  withAudio: boolean;
}): Promise<void> {
  const fps = 24;
  const frames = Math.max(1, Math.round(args.durationSec * fps));
  const { width, height } = mockVideoSize(args.resolution, args.aspectRatio);
  // zoompan on an oversampled frame avoids the integer-pixel jitter of a plain push-in.
  const ow = Math.round((width * 1.5) / 2) * 2;
  const oh = Math.round((height * 1.5) / 2) * 2;
  const vf = [
    `scale=${ow}:${oh}:force_original_aspect_ratio=increase`,
    `crop=${ow}:${oh}`,
    `zoompan=z='1+0.12*on/${frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${fps}`,
    "format=yuv420p",
  ].join(",");
  const audioIn = args.withAudio ? ["-f", "lavfi", "-t", String(args.durationSec), "-i", "anullsrc=r=48000:cl=stereo"] : [];
  const audioOut = args.withAudio ? ["-c:a", "aac", "-b:a", "96k", "-shortest"] : [];
  await runFfmpeg([
    "-i",
    args.framePath,
    ...audioIn,
    "-vf",
    vf,
    "-frames:v",
    String(frames),
    "-r",
    String(fps),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "26",
    "-pix_fmt",
    "yuv420p",
    ...audioOut,
    "-movflags",
    "+faststart",
    args.outPath,
  ]);
}

/** Mono 24 kHz WAV with a soft tone burst per word, aligned with the returned word timings. */
export function renderMockSpeech(text: string, durationSec: number): { wav: Uint8Array; words: WordTiming[] } {
  const sampleRate = 24_000;
  const words = estimateWordTimings(text, durationSec);
  const samples = new Float32Array(Math.ceil(durationSec * sampleRate));
  for (const w of words) {
    const freq = 150 + (hash32(w.word.toLowerCase()) % 90);
    const start = Math.floor(w.startSec * sampleRate);
    const length = Math.max(1, Math.floor((w.endSec - w.startSec) * 0.85 * sampleRate));
    for (let i = 0; i < length && start + i < samples.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.sin((Math.PI * i) / length);
      samples[start + i] = 0.08 * envelope * (Math.sin(2 * Math.PI * freq * t) + 0.3 * Math.sin(4 * Math.PI * freq * t));
    }
  }
  return { wav: floatToWav(samples, sampleRate), words };
}

/** Stereo 44.1 kHz WAV of a soft major chord with fades, `durationSec` long. */
export async function renderMockMusic(prompt: string, durationSec: number): Promise<Uint8Array> {
  const roots = [196, 220, 246.94, 261.63, 293.66];
  const root = roots[hash32(prompt) % roots.length]!;
  const [f1, f2, f3] = [root, root * 1.25, root * 1.5].map((f) => f.toFixed(2));
  const expr = `0.05*sin(2*PI*${f1}*t)+0.04*sin(2*PI*${f2}*t)+0.04*sin(2*PI*${f3}*t)`;
  const fade = Math.min(2, durationSec / 4);
  return withTempDir(async (dir) => {
    const out = join(dir, "music.wav");
    await runFfmpeg([
      "-f",
      "lavfi",
      "-i",
      `aevalsrc=exprs=${expr}:s=44100:d=${durationSec}`,
      "-af",
      `afade=t=in:d=${fade},afade=t=out:st=${Math.max(0, durationSec - fade)}:d=${fade}`,
      "-ac",
      "2",
      "-c:a",
      "pcm_s16le",
      out,
    ]);
    return new Uint8Array(await readFile(out));
  });
}
