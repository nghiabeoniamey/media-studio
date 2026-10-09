import { and, eq, gte, sql } from "drizzle-orm";
import { assertTransition, monthStart, roundUsd, type Usage, type VideoStatus } from "@media-studio/core";
import type { Database } from "./client";
import { costLedger, videos } from "./schema";

/** Total spend recorded for a niche since the first day of `now`'s month (UTC). */
export async function spentThisMonth(db: Database, nicheId: string, now = new Date()): Promise<number> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${costLedger.costUsd}), 0)` })
    .from(costLedger)
    .where(and(eq(costLedger.nicheId, nicheId), gte(costLedger.createdAt, monthStart(now))));
  return Number(row?.total ?? 0);
}

/**
 * Book provider usage into the ledger. `idempotencyKey` must be stable for a given
 * workflow step attempt (e.g. `${videoId}:keyframe:${shot}:${attempt}`) so a replayed
 * step never double-charges. Also refreshes the video's running total.
 */
export async function recordUsage(
  db: Database,
  args: { nicheId: string; videoId: string | null; usage: Usage[]; idempotencyKey: string },
): Promise<void> {
  if (args.usage.length === 0) return;
  await db.transaction(async (tx) => {
    await tx
      .insert(costLedger)
      .values(
        args.usage.map((u, i) => ({
          nicheId: args.nicheId,
          videoId: args.videoId,
          provider: u.provider,
          model: u.model,
          operation: u.operation,
          units: u.units,
          unitType: u.unitType,
          costUsd: roundUsd(u.costUsd),
          idempotencyKey: `${args.idempotencyKey}#${i}`,
        })),
      )
      .onConflictDoNothing({ target: costLedger.idempotencyKey });
    if (args.videoId) {
      await tx
        .update(videos)
        .set({
          actualCostUsd: sql`(select coalesce(sum(${costLedger.costUsd}), 0) from ${costLedger} where ${costLedger.videoId} = ${args.videoId})`,
        })
        .where(eq(videos.id, args.videoId));
    }
  });
}

/** Move a video through the status machine atomically; throws InvalidTransitionError on illegal moves. */
export async function transitionVideo(
  db: Database,
  videoId: string,
  to: VideoStatus,
  patch: Partial<typeof videos.$inferInsert> = {},
): Promise<VideoStatus> {
  return db.transaction(async (tx) => {
    const [row] = await tx.select({ status: videos.status }).from(videos).where(eq(videos.id, videoId)).for("update");
    if (!row) throw new Error(`video ${videoId} not found`);
    if (row.status !== to) assertTransition(row.status, to);
    await tx
      .update(videos)
      .set({ ...patch, status: to })
      .where(eq(videos.id, videoId));
    return row.status;
  });
}
