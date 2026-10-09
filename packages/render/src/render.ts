import { BrandKit, CaptionPreset, type RenderInput, type RenderShot } from "@media-studio/core";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderMedia, selectComposition, type ChromiumOptions } from "@remotion/renderer";
import { mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeDepthImage, probeMedia } from "./ffmpeg";
import { COMPOSITION_ID, type StoryVideoProps } from "./lib/style";
import { startAssetServer, type AssetServer } from "./server";

const PACKAGE_ROOT = fileURLToPath(new URL("..", import.meta.url));
const ENTRY_POINT = fileURLToPath(new URL("./remotion/entry.ts", import.meta.url));

export interface RenderVideoOptions {
  outputPath: string;
  /** Chrome Headless Shell / Chromium. Defaults to env REMOTION_BROWSER_EXECUTABLE, else Remotion's own download. */
  browserExecutable?: string | null;
  /** Parallel browser tabs. Defaults to env RENDER_CONCURRENCY, else Remotion's default (half the CPU threads). */
  concurrency?: number;
  onProgress?: (fraction: number) => void;
}

export interface RenderVideoResult {
  outputPath: string;
  durationSec: number;
  bytes: number;
}

let bundlePromise: Promise<string> | null = null;

/** Webpack-bundle the composition once per process; later renders reuse the serve URL. */
export function bundleComposition(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = bundle({
      entryPoint: ENTRY_POINT,
      rootDir: PACKAGE_ROOT,
      enableCaching: true,
      onProgress: () => {},
    }).catch((err: unknown) => {
      bundlePromise = null;
      throw err;
    });
  }
  return bundlePromise;
}

function resolveBrowser(opt: string | null | undefined): string | null {
  if (opt !== undefined) return opt;
  return process.env.REMOTION_BROWSER_EXECUTABLE || null;
}

function resolveConcurrency(opt: number | undefined): number | null {
  if (opt !== undefined) return Math.max(1, Math.floor(opt));
  const env = Number(process.env.RENDER_CONCURRENCY);
  return Number.isFinite(env) && env > 0 ? Math.floor(env) : null;
}

async function assertFile(path: string, label: string): Promise<void> {
  try {
    const s = await stat(path);
    if (!s.isFile()) throw new Error("not a file");
  } catch {
    throw new Error(`renderVideo: ${label} not found: ${path}`);
  }
}

/** Fill schema defaults and check the timeline before spending minutes in Chrome. */
export async function normalizeRenderInput(input: RenderInput): Promise<RenderInput> {
  if (!(input.totalDurationSec > 0)) throw new Error("renderVideo: totalDurationSec must be > 0");
  if (!(input.fps > 0) || !(input.width > 0) || !(input.height > 0)) throw new Error("renderVideo: invalid width/height/fps");
  if (input.shots.length === 0) throw new Error("renderVideo: RenderInput has no shots");

  const checks: Promise<void>[] = [];
  for (const s of input.shots) checks.push(assertFile(s.src, `shot ${s.index} source`));
  if (input.narration.src) checks.push(assertFile(input.narration.src, "narration"));
  if (input.music) checks.push(assertFile(input.music.src, "music"));
  if (input.brand?.logoSrc) checks.push(assertFile(input.brand.logoSrc, "brand logo"));
  await Promise.all(checks);

  const shots: RenderShot[] = await Promise.all(
    input.shots.map(async (s) => {
      if (s.kind !== "clip" || (s.clipDurationSec !== null && s.clipDurationSec > 0)) return s;
      const probe = await probeMedia(s.src);
      return { ...s, clipDurationSec: probe.durationSec > 0 ? probe.durationSec : null };
    }),
  );
  let music = input.music;
  if (music && !(music.durationSec > 0)) {
    music = { ...music, durationSec: (await probeMedia(music.src)).durationSec };
  }
  return {
    ...input,
    shots,
    music,
    captions: input.captions ? { ...input.captions, preset: CaptionPreset.parse(input.captions.preset) } : null,
    brand: input.brand ? { ...BrandKit.parse(input.brand), logoSrc: input.brand.logoSrc ?? null } : null,
  };
}

/** Map local files to URLs on the private asset server and pre-blur the depth layers of stills. */
async function prepareProps(input: RenderInput, server: AssetServer, workDir: string): Promise<StoryVideoProps> {
  const url = (p: string) => server.register(p);
  const depthSrc: Record<string, string> = {};
  const stills = input.shots.filter((s) => s.kind === "still");
  const queue = [...stills];
  const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
    for (let s = queue.shift(); s; s = queue.shift()) {
      const out = join(workDir, `depth-${s.index}.jpg`);
      try {
        await makeDepthImage(s.src, out);
        depthSrc[String(s.index)] = url(out);
      } catch {
        // The composition falls back to a CSS blur of the original.
      }
    }
  });
  await Promise.all(workers);

  return {
    input: {
      ...input,
      shots: input.shots.map((s) => ({ ...s, src: url(s.src) })),
      narration: { ...input.narration, src: input.narration.src ? url(input.narration.src) : "" },
      music: input.music ? { ...input.music, src: url(input.music.src) } : null,
      brand: input.brand ? { ...input.brand, logoSrc: input.brand.logoSrc ? url(input.brand.logoSrc) : null } : null,
    },
    depthSrc,
  };
}

/**
 * Render a RenderInput to an H.264/AAC MP4 (yuv420p, CRF 20). Local media are served
 * from a private 127.0.0.1 server for the duration of the render only.
 */
export async function renderVideo(input: RenderInput, opts: RenderVideoOptions): Promise<RenderVideoResult> {
  const outputPath = resolve(opts.outputPath);
  const report = (f: number) => opts.onProgress?.(Math.min(1, Math.max(0, f)));
  report(0);

  const normalized = await normalizeRenderInput(input);
  const browserExecutable = resolveBrowser(opts.browserExecutable);
  const concurrency = resolveConcurrency(opts.concurrency);
  const chromiumOptions: ChromiumOptions = {};
  const logLevel = (process.env.REMOTION_LOG_LEVEL as "error" | "warn" | "info" | "verbose" | undefined) ?? "error";

  const workDir = await mkdtemp(join(tmpdir(), "ms-render-"));
  const server = await startAssetServer();
  let browser: Awaited<ReturnType<typeof openBrowser>> | null = null;
  try {
    const [serveUrl, inputProps] = await Promise.all([bundleComposition(), prepareProps(normalized, server, workDir)]);
    report(0.03);
    browser = await openBrowser("chrome", { browserExecutable, chromiumOptions, logLevel });
    const composition = await selectComposition({
      serveUrl,
      id: COMPOSITION_ID,
      inputProps,
      puppeteerInstance: browser,
      browserExecutable,
      chromiumOptions,
      logLevel,
    });
    report(0.05);
    await mkdir(dirname(outputPath), { recursive: true });
    await renderMedia({
      serveUrl,
      composition,
      inputProps,
      codec: "h264",
      audioCodec: "aac",
      audioBitrate: "192k",
      crf: 20,
      pixelFormat: "yuv420p",
      imageFormat: "jpeg",
      jpegQuality: 92,
      outputLocation: outputPath,
      overwrite: true,
      enforceAudioTrack: true,
      concurrency,
      puppeteerInstance: browser,
      browserExecutable,
      chromiumOptions,
      logLevel,
      timeoutInMilliseconds: 120_000,
      licenseKey: process.env.REMOTION_LICENSE_KEY || null,
      onProgress: ({ progress }) => report(0.05 + 0.93 * progress),
    });
  } finally {
    await browser?.close({ silent: true }).catch(() => {});
    await server.close();
    await rm(workDir, { recursive: true, force: true });
  }

  const [probe, info] = await Promise.all([probeMedia(outputPath), stat(outputPath)]);
  if (!probe.hasVideo) throw new Error(`renderVideo: output has no video stream: ${outputPath}`);
  report(1);
  return { outputPath, durationSec: probe.durationSec, bytes: info.size };
}
