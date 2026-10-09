import { randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { basename, extname, resolve } from "node:path";
import { pipeline } from "node:stream/promises";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".opus": "audio/ogg",
  ".flac": "audio/flac",
};

export function mimeForPath(path: string): string {
  return MIME[extname(path).toLowerCase()] ?? "application/octet-stream";
}

export type ByteRange = { start: number; end: number } | "unsatisfiable" | null;

/** Parse a single-range `Range` header. Multi-range and malformed headers return null (serve the whole file). */
export function parseRange(header: string | undefined, size: number): ByteRange {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === "" && m[2] === "")) return null;
  if (m[1] === "") {
    const suffix = Number(m[2]);
    if (suffix === 0) return "unsatisfiable";
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(m[1]);
  const end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (start >= size || end < start) return "unsatisfiable";
  return { start, end };
}

export interface AssetServer {
  readonly origin: string;
  /** Expose one local file under an unguessable path; returns its URL. Registering the same file twice reuses the URL. */
  register(path: string): string;
  close(): Promise<void>;
}

/**
 * Serves exactly the files registered for one render on 127.0.0.1, each under a random
 * path. Nothing else on disk is reachable. Supports HEAD and single byte ranges.
 */
export async function startAssetServer(): Promise<AssetServer> {
  const byToken = new Map<string, string>();
  const byPath = new Map<string, string>();

  const server = createServer((req, res) => {
    handle(req, res).catch(() => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  });

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store");
    if (req.method === "OPTIONS") {
      res.writeHead(204, { "Access-Control-Allow-Methods": "GET, HEAD", "Access-Control-Allow-Headers": "Range" });
      res.end();
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" });
      res.end();
      return;
    }
    const token = (req.url ?? "").split("?")[0]!.split("/")[1] ?? "";
    const file = byToken.get(token);
    if (!file) {
      res.writeHead(404);
      res.end();
      return;
    }
    const info = await stat(file);
    const size = info.size;
    const headers: Record<string, string | number> = {
      "Content-Type": mimeForPath(file),
      "Accept-Ranges": "bytes",
    };
    const range = parseRange(req.headers.range, size);
    if (range === "unsatisfiable") {
      res.writeHead(416, { ...headers, "Content-Range": `bytes */${size}` });
      res.end();
      return;
    }
    if (range) {
      res.writeHead(206, {
        ...headers,
        "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
        "Content-Length": range.end - range.start + 1,
      });
    } else {
      res.writeHead(200, { ...headers, "Content-Length": size });
    }
    if (req.method === "HEAD" || size === 0) {
      res.end();
      return;
    }
    await pipeline(createReadStream(file, range ? { start: range.start, end: range.end } : {}), res).catch(() => {
      // Client aborted (Chrome cancels media requests freely); nothing to do.
    });
  }

  await new Promise<void>((ok, fail) => {
    server.once("error", fail);
    server.listen(0, "127.0.0.1", () => ok());
  });
  const { port } = server.address() as AddressInfo;
  const origin = `http://127.0.0.1:${port}`;

  return {
    origin,
    register(path: string) {
      const abs = resolve(path);
      let token = byPath.get(abs);
      if (!token) {
        token = randomBytes(16).toString("hex");
        byPath.set(abs, token);
        byToken.set(token, abs);
      }
      return `${origin}/${token}/${encodeURIComponent(basename(abs))}`;
    },
    close() {
      return new Promise<void>((ok) => {
        server.close(() => ok());
        server.closeAllConnections();
      });
    },
  };
}
