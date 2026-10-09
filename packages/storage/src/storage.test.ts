import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LocalStorage, createStorageFromEnv, extensionFor, mimeFromKey, newKey } from "./index";

describe("LocalStorage", () => {
  it("round-trips files and exposes a local path", async () => {
    const root = await mkdtemp(join(tmpdir(), "ms-storage-"));
    const storage = new LocalStorage(root, "https://studio.example.com/media/");
    const key = newKey("niches/n1/videos/v1/keyframe", "image/png");
    expect(key).toMatch(/^niches\/n1\/videos\/v1\/keyframe\/[0-9a-f-]{36}\.png$/);
    await storage.put(key, new TextEncoder().encode("hello"), "image/png");
    expect(await storage.exists(key)).toBe(true);
    expect((await storage.get(key)).toString()).toBe("hello");
    expect(await readFile(await storage.toLocalFile(key), "utf8")).toBe("hello");
    expect(await storage.publicUrl(key)).toBe(`https://studio.example.com/media/${key}`);
    await storage.delete(key);
    expect(await storage.exists(key)).toBe(false);
  });

  it("rejects path traversal", async () => {
    const storage = new LocalStorage(await mkdtemp(join(tmpdir(), "ms-storage-")));
    for (const bad of ["../etc/passwd", "/abs", "a/../../b", "a//b", "a\\b", ""]) {
      await expect(storage.put(bad, new Uint8Array(), "text/plain")).rejects.toThrow(/unsafe/);
    }
  });
});

describe("helpers", () => {
  it("maps mime types and extensions both ways", () => {
    expect(extensionFor("audio/wav")).toBe("wav");
    expect(extensionFor("video/mp4; codecs=avc1")).toBe("mp4");
    expect(mimeFromKey("x/y.mp4")).toBe("video/mp4");
    expect(mimeFromKey("x/y.unknown")).toBe("application/octet-stream");
  });
  it("validates s3 env", () => {
    expect(() => createStorageFromEnv({ STORAGE_DRIVER: "s3" })).toThrow(/S3_BUCKET/);
    expect(createStorageFromEnv({}).kind).toBe("local");
  });
});
