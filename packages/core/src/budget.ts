import type { ProviderSelection, StrategyParams } from "./niche";
import type { BeatPurpose } from "./script";
import type { ShotSpec } from "./shot";
import { imageCost, llmCost, musicCost, ttsCost, videoCost } from "./pricing";

const PURPOSE_WEIGHT: Record<BeatPurpose, number> = {
  hook: 30,
  turning_point: 25,
  resolution: 15,
  rising: 12,
  context: 6,
  reflection: 3,
  cta: 0,
};

export interface HeroAllocation {
  shots: ShotSpec[];
  heroSeconds: number;
  targetHeroSeconds: number;
  notes: string[];
}

/**
 * Decide which shots get real AI motion under the niche's strategy. The LLM proposes
 * `kind`, but money is enforced here: hero seconds never exceed the per-video cap, and
 * at least `minHeroShots` clips are kept so a video never becomes a pure slideshow.
 */
export function allocateHeroShots(
  shots: ShotSpec[],
  params: StrategyParams,
  beatPurposes: Record<string, BeatPurpose>,
): HeroAllocation {
  const notes: string[] = [];
  const total = shots.reduce((s, x) => s + x.durationSec, 0);
  const cap = params.maxHeroSecondsPerVideo;

  if (params.heroTimeFraction >= 1) {
    const all = shots.map((s) => ({ ...s, kind: "hero" as const }));
    const heroSeconds = all.reduce((s, x) => s + x.durationSec, 0);
    if (heroSeconds > cap) notes.push(`full_motion video needs ${heroSeconds}s of AI video, above the ${cap}s cap`);
    return { shots: all, heroSeconds, targetHeroSeconds: heroSeconds, notes };
  }

  const target = Math.min(cap, total * params.heroTimeFraction);
  const ranked = shots
    .map((s) => ({
      index: s.index,
      duration: s.durationSec,
      score:
        (s.kind === "hero" ? 100 : 0) +
        (PURPOSE_WEIGHT[beatPurposes[s.beatId] ?? "context"] ?? 0) +
        (s.camera.movement !== "static" ? 10 : 0) +
        (s.characters.length > 0 ? 5 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const hero = new Set<number>();
  let heroSeconds = 0;
  for (const r of ranked) {
    const needMin = hero.size < params.minHeroShots;
    const fitsTarget = heroSeconds + r.duration <= target;
    const fitsCap = heroSeconds + r.duration <= cap;
    if (fitsCap && (needMin || fitsTarget)) {
      hero.add(r.index);
      heroSeconds += r.duration;
    }
  }
  if (hero.size < Math.min(params.minHeroShots, shots.length)) {
    notes.push(`only ${hero.size} hero shot(s) fit the ${cap}s cap; shorten hero shots or raise the cap`);
  }

  const out = shots.map((s) => {
    const kind = hero.has(s.index) ? ("hero" as const) : ("still" as const);
    let continuity = s.continuity;
    if (continuity.continueFrom !== null && !hero.has(continuity.continueFrom)) {
      notes.push(`shot ${s.index}: dropped continueFrom ${continuity.continueFrom} (source is now a still)`);
      continuity = { ...continuity, continueFrom: null };
    }
    if (kind !== "hero" && continuity.continueFrom !== null) {
      continuity = { ...continuity, continueFrom: null };
    }
    return { ...s, kind, continuity };
  });
  return { shots: out, heroSeconds, targetHeroSeconds: target, notes };
}

/** Planning token counts per LLM stage (input, output). Measured usage replaces these in the ledger. */
export const LLM_STAGE_TOKENS = {
  research: { input: 6_000, output: 2_500 },
  script: { input: 7_000, output: 2_500 },
  shotList: { input: 9_000, output: 5_000 },
  qa: { input: 3_000, output: 500 },
} as const;

export interface CostEstimate {
  llm: number;
  characterSheets: number;
  keyframes: number;
  video: number;
  tts: number;
  music: number;
  total: number;
  /** Multiplier applied to generation lines for regenerations/retries. */
  retryFactor: number;
}

export interface EstimateInput {
  shots: Pick<ShotSpec, "kind" | "durationSec">[];
  providers: ProviderSelection;
  narrationSeconds: number;
  narrationCharacters: number;
  /** Characters without a ready character sheet (each costs `viewsPerCharacter` images). */
  newCharacters: number;
  viewsPerCharacter?: number;
  /** Reference images sent with each hero clip request. */
  referenceImagesPerClip?: number;
  /** Generate a new music track instead of reusing the niche library. */
  newMusic?: boolean;
  retryFactor?: number;
}

export function estimateVideoCost(input: EstimateInput): CostEstimate {
  const retry = input.retryFactor ?? 1.5;
  const p = input.providers;
  const views = input.viewsPerCharacter ?? 6;

  const llm = Object.values(LLM_STAGE_TOKENS).reduce(
    (sum, t) => sum + llmCost(p.llm.provider, p.llm.model, t.input, t.output),
    0,
  );
  const characterSheets = imageCost(p.characterSheet.provider, p.characterSheet.model, input.newCharacters * views);
  const keyframes = imageCost(p.keyframe.provider, p.keyframe.model, input.shots.length) * retry;
  const heroSeconds = input.shots.filter((s) => s.kind === "hero").reduce((s, x) => s + x.durationSec, 0);
  const heroCount = input.shots.filter((s) => s.kind === "hero").length;
  const video =
    (videoCost(p.video.primary.provider, p.video.primary.model, heroSeconds, p.video.resolution, 0) +
      heroCount *
        videoCost(p.video.primary.provider, p.video.primary.model, 0, p.video.resolution, input.referenceImagesPerClip ?? 0)) *
    retry;
  const tts = ttsCost(p.tts.provider, p.tts.model, input.narrationSeconds, input.narrationCharacters) * retry;
  const music = input.newMusic ? musicCost(p.music.provider, p.music.model) : 0;
  const total = llm + characterSheets + keyframes + video + tts + music;
  return { llm, characterSheets, keyframes, video, tts, music, total, retryFactor: retry };
}

export interface BudgetCheck {
  ok: boolean;
  remainingUsd: number;
  message: string;
}

export function checkBudget(args: { monthlyBudgetUsd: number; spentThisMonthUsd: number; estimateUsd: number }): BudgetCheck {
  const remaining = args.monthlyBudgetUsd - args.spentThisMonthUsd;
  if (args.estimateUsd > remaining) {
    return {
      ok: false,
      remainingUsd: remaining,
      message: `Estimated $${args.estimateUsd.toFixed(2)} exceeds the $${remaining.toFixed(2)} left of this month's $${args.monthlyBudgetUsd.toFixed(2)} budget`,
    };
  }
  return { ok: true, remainingUsd: remaining - args.estimateUsd, message: "within budget" };
}

/** First day of the month (UTC) for ledger aggregation. */
export function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}
