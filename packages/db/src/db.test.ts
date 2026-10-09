import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashPassword, newSessionToken, sessionIdFromToken, verifyPassword } from "./auth";
import { createDb, type DbHandle } from "./client";
import { runMigrations } from "./migrate";
import { recordUsage, spentThisMonth, transitionVideo } from "./queries";
import { series, stories, videos } from "./schema";
import { seedBibleNiche } from "./seed";

describe("auth helpers", () => {
  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("wrong password!!", hash)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });
  it("rejects short passwords", async () => {
    await expect(hashPassword("short")).rejects.toThrow(/at least/);
  });
  it("stores only the token hash", () => {
    const { token, id } = newSessionToken();
    expect(id).toBe(sessionIdFromToken(token));
    expect(id).not.toContain(token);
  });
});

const url = process.env.DATABASE_URL_TEST;

describe.skipIf(!url)("database (DATABASE_URL_TEST)", () => {
  let handle: DbHandle;
  let nicheId: string;
  let videoId: string;

  beforeAll(async () => {
    await runMigrations(url);
    handle = createDb(url);
    nicheId = await seedBibleNiche(handle.db, { mock: true, slug: `test-${Date.now()}` });
    const [s] = await handle.db.select().from(series).where(eq(series.nicheId, nicheId)).limit(1);
    const [story] = await handle.db
      .insert(stories)
      .values({ nicheId, seriesId: s!.id, input: { kind: "topic", topic: "David and Goliath", notes: "" } })
      .returning();
    const [video] = await handle.db
      .insert(videos)
      .values({ storyId: story!.id, nicheId, seriesId: s!.id, strategy: "hybrid", targetDurationSec: 45 })
      .returning();
    videoId = video!.id;
  });

  afterAll(async () => {
    await handle?.close();
  });

  it("books usage idempotently and keeps the video total in sync", async () => {
    const usage = [
      { provider: "minimax", model: "MiniMax-H3-Max", operation: "clip", units: 5, unitType: "video_second" as const, costUsd: 0.4 },
      { provider: "google", model: "gemini-nano-banana-2.1", operation: "keyframe", units: 1, unitType: "image" as const, costUsd: 0.0336 },
    ];
    await recordUsage(handle.db, { nicheId, videoId, usage, idempotencyKey: `${videoId}:shot0:1` });
    await recordUsage(handle.db, { nicheId, videoId, usage, idempotencyKey: `${videoId}:shot0:1` });
    expect(await spentThisMonth(handle.db, nicheId)).toBeCloseTo(0.4336);
    const [v] = await handle.db.select().from(videos).where(eq(videos.id, videoId));
    expect(v!.actualCostUsd).toBeCloseTo(0.4336);
  });

  it("enforces the status machine", async () => {
    expect(await transitionVideo(handle.db, videoId, "researching")).toBe("draft");
    await expect(transitionVideo(handle.db, videoId, "published")).rejects.toThrow(/cannot move/);
    // same-status transitions are no-ops
    expect(await transitionVideo(handle.db, videoId, "researching")).toBe("researching");
  });
});
