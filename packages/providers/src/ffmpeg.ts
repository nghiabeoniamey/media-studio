import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function ffmpegPath(): string {
  return process.env.FFMPEG_PATH || "ffmpeg";
}

export function ffprobePath(): string {
  return process.env.FFPROBE_PATH || "ffprobe";
}

/** Run a binary with an argument array (never a shell string) and collect stdout/stderr. */
export function run(command: string, args: string[], opts: { timeoutMs?: number } = {}): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    let errBytes = 0;
    child.stdout.on("data", (chunk: Buffer) => out.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => {
      // keep only the tail; ffmpeg can be chatty
      err.push(chunk);
      errBytes += chunk.length;
      while (errBytes > 64_000 && err.length > 1) errBytes -= err.shift()!.length;
    });
    const timer = setTimeout(() => child.kill("SIGKILL"), opts.timeoutMs ?? 5 * 60_000);
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      const stdout = Buffer.concat(out).toString("utf8");
      const stderr = Buffer.concat(err).toString("utf8");
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited with ${code ?? signal}: ${stderr.trim().split("\n").slice(-6).join("\n")}`));
    });
  });
}

export function runFfmpeg(args: string[], opts?: { timeoutMs?: number }) {
  return run(ffmpegPath(), ["-hide_banner", "-loglevel", "error", "-nostdin", "-y", ...args], opts);
}

/** Container duration in seconds via ffprobe, or null when it cannot be read. */
export async function probeDurationSec(path: string): Promise<number | null> {
  try {
    const { stdout } = await run(ffprobePath(), ["-v", "error", "-show_entries", "format=duration", "-of", "json", path], {
      timeoutMs: 30_000,
    });
    const value = Number((JSON.parse(stdout) as { format?: { duration?: string } }).format?.duration);
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export async function probeBytesDurationSec(data: Uint8Array, ext: string): Promise<number | null> {
  const dir = await mkdtemp(join(tmpdir(), "ms-probe-"));
  try {
    const path = join(dir, `media.${ext.replace(/[^a-z0-9]/gi, "") || "bin"}`);
    await writeFile(path, data);
    return await probeDurationSec(path);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
