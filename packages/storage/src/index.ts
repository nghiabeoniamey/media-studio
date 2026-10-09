import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, normalize, resolve, sep } from "node:path";

/**
 * Object storage for every generated asset. Keys are POSIX-style paths
 * (e.g. `niches/<id>/videos/<id>/keyframe/<uuid>.png`).
 */
export interface Storage {
  readonly kind: "local" | "s3";
  put(key: string, data: Uint8Array, mimeType: string): Promise<{ key: string; bytes: number }>;
  get(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  /**
   * URL that external services (video APIs, publishers) can fetch. For S3/R2 this is the
   * public custom domain when configured, else a presigned URL. Local storage returns a URL
   * only when STORAGE_PUBLIC_BASE_URL points at the web app's media route.
   */
  publicUrl(key: string, expiresInSec?: number): Promise<string | null>;
  /** Path on local disk for ffmpeg/Remotion. S3 objects are downloaded into a cache dir. */
  toLocalFile(key: string): Promise<string>;
}

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "application/json": "json",
  "application/zip": "zip",
  "text/plain": "txt",
  "text/vtt": "vtt",
};

export function extensionFor(mimeType: string): string {
  return EXT_BY_MIME[mimeType.split(";")[0]!.trim().toLowerCase()] ?? "bin";
}

export function mimeFromKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  for (const [mime, e] of Object.entries(EXT_BY_MIME)) if (e === ext) return mime;
  return "application/octet-stream";
}

/** Build a collision-free key: `<prefix>/<uuid>.<ext>`. */
export function newKey(prefix: string, mimeType: string): string {
  const clean = prefix.replace(/^\/+|\/+$/g, "");
  return `${clean}/${randomUUID()}.${extensionFor(mimeType)}`;
}

function assertSafeKey(key: string): void {
  if (!key || key.startsWith("/") || key.includes("\\") || key.split("/").some((p) => p === ".." || p === "." || p === "")) {
    throw new Error(`unsafe storage key: ${key}`);
  }
}

export class LocalStorage implements Storage {
  readonly kind = "local" as const;
  private readonly root: string;

  constructor(
    root: string,
    private readonly publicBaseUrl: string | null = null,
  ) {
    this.root = resolve(root);
  }

  private pathFor(key: string): string {
    assertSafeKey(key);
    const full = normalize(join(this.root, key));
    if (!full.startsWith(this.root + sep)) throw new Error(`unsafe storage key: ${key}`);
    return full;
  }

  async put(key: string, data: Uint8Array, _mimeType: string) {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
    return { key, bytes: data.byteLength };
  }

  async get(key: string) {
    return readFile(this.pathFor(key));
  }

  async exists(key: string) {
    try {
      await stat(this.pathFor(key));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string) {
    await rm(this.pathFor(key), { force: true });
  }

  async publicUrl(key: string) {
    assertSafeKey(key);
    return this.publicBaseUrl ? `${this.publicBaseUrl.replace(/\/+$/, "")}/${key}` : null;
  }

  async toLocalFile(key: string) {
    const path = this.pathFor(key);
    await stat(path);
    return path;
  }
}

export interface S3Options {
  bucket: string;
  endpoint?: string;
  region?: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Public custom domain bound to the bucket (required for TikTok PULL_FROM_URL and Meta fetches). */
  publicBaseUrl?: string | null;
  cacheDir?: string;
}

export class S3Storage implements Storage {
  readonly kind = "s3" as const;
  private readonly client: S3Client;
  private readonly cacheDir: string;

  constructor(private readonly opts: S3Options) {
    this.client = new S3Client({
      region: opts.region ?? "auto",
      endpoint: opts.endpoint,
      forcePathStyle: Boolean(opts.endpoint),
      credentials: { accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey },
    });
    this.cacheDir = resolve(opts.cacheDir ?? join(tmpdir(), "media-studio-cache"));
  }

  async put(key: string, data: Uint8Array, mimeType: string) {
    assertSafeKey(key);
    await this.client.send(new PutObjectCommand({ Bucket: this.opts.bucket, Key: key, Body: data, ContentType: mimeType }));
    return { key, bytes: data.byteLength };
  }

  async get(key: string) {
    assertSafeKey(key);
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.opts.bucket, Key: key }));
    if (!res.Body) throw new Error(`empty object ${key}`);
    return Buffer.from(await res.Body.transformToByteArray());
  }

  async exists(key: string) {
    assertSafeKey(key);
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.opts.bucket, Key: key }));
      return true;
    } catch (err) {
      if ((err as { name?: string }).name === "NotFound" || (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return false;
      throw err;
    }
  }

  async delete(key: string) {
    assertSafeKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.opts.bucket, Key: key }));
  }

  async publicUrl(key: string, expiresInSec = 6 * 3600) {
    assertSafeKey(key);
    if (this.opts.publicBaseUrl) return `${this.opts.publicBaseUrl.replace(/\/+$/, "")}/${key}`;
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.opts.bucket, Key: key }), { expiresIn: expiresInSec });
  }

  async toLocalFile(key: string) {
    assertSafeKey(key);
    const path = join(this.cacheDir, key);
    try {
      await stat(path);
      return path;
    } catch {
      const data = await this.get(key);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, data);
      return path;
    }
  }
}

/**
 * STORAGE_DRIVER=local (default): STORAGE_DIR, STORAGE_PUBLIC_BASE_URL
 * STORAGE_DRIVER=s3: S3_BUCKET, S3_ENDPOINT (R2: https://<account>.r2.cloudflarestorage.com),
 *   S3_REGION (R2: auto), S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_BASE_URL
 */
export function createStorageFromEnv(env: NodeJS.ProcessEnv = process.env): Storage {
  const driver = env.STORAGE_DRIVER ?? "local";
  if (driver === "s3") {
    const required = ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const;
    for (const k of required) if (!env[k]) throw new Error(`${k} is required when STORAGE_DRIVER=s3`);
    return new S3Storage({
      bucket: env.S3_BUCKET!,
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      publicBaseUrl: env.S3_PUBLIC_BASE_URL ?? null,
      cacheDir: env.STORAGE_CACHE_DIR,
    });
  }
  if (driver !== "local") throw new Error(`unknown STORAGE_DRIVER ${driver}`);
  return new LocalStorage(env.STORAGE_DIR ?? "./data/storage", env.STORAGE_PUBLIC_BASE_URL ?? null);
}
