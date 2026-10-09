import { ProviderError, type BinaryData, type MediaInput } from "@media-studio/core";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { kindForStatus, toProviderError } from "./errors";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
};

export function extensionForMime(mimeType: string): string {
  const mime = mimeType.split(";")[0]!.trim().toLowerCase();
  for (const [ext, m] of Object.entries(MIME_BY_EXT)) if (m === mime) return ext.slice(1);
  return "bin";
}

export function guessMimeType(pathOrUrl: string, fallback = "application/octet-stream"): string {
  let path = pathOrUrl;
  try {
    path = new URL(pathOrUrl).pathname;
  } catch {
    // plain path
  }
  return MIME_BY_EXT[extname(path).toLowerCase()] ?? fallback;
}

/** Detect common media types from magic bytes (vendors do not always send a content-type). */
export function sniffMimeType(data: Uint8Array): string | null {
  const ascii = (start: number, len: number) => String.fromCharCode(...data.subarray(start, start + len));
  if (data.length >= 8 && data[0] === 0x89 && ascii(1, 3) === "PNG") return "image/png";
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "image/jpeg";
  if (data.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
  if (data.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WAVE") return "audio/wav";
  if (data.length >= 12 && ascii(4, 4) === "ftyp") return "video/mp4";
  if (data.length >= 3 && (ascii(0, 3) === "ID3" || (data[0] === 0xff && ((data[1] ?? 0) & 0xe0) === 0xe0))) return "audio/mpeg";
  return null;
}

export function bytesToBase64(data: Uint8Array): string {
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("base64");
}

export function base64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

export function toDataUrl(bin: BinaryData): string {
  return `data:${bin.mimeType};base64,${bytesToBase64(bin.data)}`;
}

function parseDataUrl(url: string): BinaryData | null {
  const match = /^data:([^;,]+)?((?:;[^;,]+)*?)(;base64)?,(.*)$/s.exec(url);
  if (!match) return null;
  const mimeType = match[1] ?? "application/octet-stream";
  const payload = match[4] ?? "";
  const data = match[3] ? base64ToBytes(payload) : new TextEncoder().encode(decodeURIComponent(payload));
  return { data, mimeType };
}

/**
 * Resolve a MediaInput to bytes. Supports inline bytes, data: URLs, file:// URLs and http(s)
 * URLs (fetched with `fetchImpl`). Download failures surface as ProviderError so workflow
 * steps retry transient errors.
 */
export async function mediaInputToBytes(input: MediaInput, fetchImpl: typeof fetch = fetch): Promise<BinaryData> {
  if (input.kind === "bytes") return { data: input.data, mimeType: input.mimeType };
  const { url } = input;
  if (url.startsWith("data:")) {
    const parsed = parseDataUrl(url);
    if (!parsed) throw new ProviderError(`invalid data URL`, { kind: "fatal", provider: "media" });
    return { data: parsed.data, mimeType: input.mimeType ?? parsed.mimeType };
  }
  if (url.startsWith("file:") || url.startsWith("/")) {
    const path = url.startsWith("file:") ? fileURLToPath(url) : url;
    try {
      const data = new Uint8Array(await readFile(path));
      return { data, mimeType: input.mimeType ?? sniffMimeType(data) ?? guessMimeType(path) };
    } catch (err) {
      throw new ProviderError(`cannot read ${path}: ${(err as Error).message}`, { kind: "fatal", provider: "media", cause: err });
    }
  }
  let res: Response;
  try {
    res = await fetchImpl(url, { signal: AbortSignal.timeout(10 * 60_000) });
  } catch (err) {
    throw toProviderError("media", err, { operation: `download ${redactUrl(url)}` });
  }
  if (!res.ok) {
    throw new ProviderError(`media download ${redactUrl(url)} failed (HTTP ${res.status})`, {
      kind: kindForStatus(res.status),
      provider: "media",
    });
  }
  const data = new Uint8Array(await res.arrayBuffer());
  const header = res.headers.get("content-type")?.split(";")[0]?.trim();
  const mimeType =
    input.mimeType ??
    (header && header !== "application/octet-stream" && header !== "binary/octet-stream" ? header : null) ??
    sniffMimeType(data) ??
    guessMimeType(url);
  return { data, mimeType };
}

/** Strip query strings (signed URLs carry credentials) before putting a URL in an error message. */
export function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url.slice(0, 80);
  }
}

// ---------- images ----------

/** Width/height from PNG, JPEG or WebP headers; null when unknown. */
export function imageDimensions(data: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const mime = sniffMimeType(data);
  if (mime === "image/png" && data.length >= 24) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (mime === "image/jpeg") {
    let offset = 2;
    while (offset + 9 < data.length) {
      if (data[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = data[offset + 1]!;
      const length = view.getUint16(offset + 2);
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
      offset += 2 + length;
    }
    return null;
  }
  if (mime === "image/webp" && data.length >= 30) {
    const chunk = String.fromCharCode(...data.subarray(12, 16));
    if (chunk === "VP8X") {
      const w = 1 + (data[24]! | (data[25]! << 8) | (data[26]! << 16));
      const h = 1 + (data[27]! | (data[28]! << 8) | (data[29]! << 16));
      return { width: w, height: h };
    }
    if (chunk === "VP8 ") return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    if (chunk === "VP8L") {
      const b = view.getUint32(21, true);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
  }
  return null;
}

// ---------- audio ----------

export interface WavInfo {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  dataOffset: number;
  dataLength: number;
  durationSec: number;
}

/** Wrap headerless little-endian PCM in a RIFF/WAVE container. */
export function pcmToWav(pcm: Uint8Array, sampleRate: number, channels = 1, bitsPerSample = 16): Uint8Array {
  const out = new Uint8Array(44 + pcm.byteLength);
  const view = new DataView(out.buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) out[offset + i] = text.charCodeAt(i);
  };
  const blockAlign = (channels * bitsPerSample) / 8;
  write(0, "RIFF");
  view.setUint32(4, 36 + pcm.byteLength, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  write(36, "data");
  view.setUint32(40, pcm.byteLength, true);
  out.set(pcm, 44);
  return out;
}

/** Parse a RIFF/WAVE header (walks chunks, so LIST/fact chunks before `data` are fine). */
export function parseWav(data: Uint8Array): WavInfo | null {
  if (sniffMimeType(data) !== "audio/wav") return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 12;
  let fmt: { channels: number; sampleRate: number; bitsPerSample: number } | null = null;
  while (offset + 8 <= data.length) {
    const id = String.fromCharCode(...data.subarray(offset, offset + 4));
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === "fmt " && body + 16 <= data.length) {
      fmt = { channels: view.getUint16(body + 2, true), sampleRate: view.getUint32(body + 4, true), bitsPerSample: view.getUint16(body + 14, true) };
    } else if (id === "data" && fmt) {
      // Streaming encoders write 0 or 0xFFFFFFFF as a placeholder size.
      const dataLength = size === 0 || size === 0xffffffff || body + size > data.length ? data.length - body : size;
      const bytesPerSecond = fmt.sampleRate * fmt.channels * (fmt.bitsPerSample / 8);
      return { ...fmt, dataOffset: body, dataLength, durationSec: bytesPerSecond > 0 ? dataLength / bytesPerSecond : 0 };
    }
    offset = body + size + (size % 2);
  }
  return null;
}

/** Encode mono float samples in [-1, 1] as a 16-bit PCM WAV. */
export function floatToWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const pcm = new Uint8Array(samples.length * 2);
  const view = new DataView(pcm.buffer);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(i * 2, Math.round(s * 32767), true);
  }
  return pcmToWav(pcm, sampleRate, 1, 16);
}
