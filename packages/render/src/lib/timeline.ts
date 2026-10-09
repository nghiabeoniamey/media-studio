import type { BrandKit, KenBurnsPlan, RenderShot } from "@media-studio/core";

// Pure timeline math shared by the Remotion composition (browser bundle) and Node.
// Nothing in src/lib may import Node built-ins: webpack bundles these files.

export const CROSSFADE_SEC = 0.3;
/** Hero clips shorter than their slot are slowed down to at most this rate, then hold the last frame. */
export const MAX_SLOWDOWN = 0.8;
export const CTA_SEC = 3;

export interface TimeWindow {
  startSec: number;
  endSec: number;
}

export interface TimelineShot {
  shot: RenderShot;
  /** Cut point where this shot takes over (narration-aligned). */
  startSec: number;
  /** Cut point where the next shot takes over (or the end of the video). */
  endSec: number;
  /** First moment the shot is drawn: half a crossfade before its cut. */
  enterSec: number;
  /** Last moment the shot is drawn: half a crossfade after the next cut. */
  exitSec: number;
  /** Length of the crossfade into this shot (0 for the first shot). */
  fadeInSec: number;
}

/**
 * Lay shots out so the whole video is covered: gaps extend the previous shot,
 * overlaps cut it, the first shot starts at 0 and the last runs to the end.
 * Crossfades are centred on each cut and never take more than half of either shot.
 */
export function planShotTimeline(shots: RenderShot[], totalSec: number, crossfadeSec = CROSSFADE_SEC): TimelineShot[] {
  if (totalSec <= 0) return [];
  const sorted = [...shots]
    .filter((s) => Number.isFinite(s.startSec) && s.startSec < totalSec)
    .sort((a, b) => a.startSec - b.startSec || a.index - b.index);
  const cuts = sorted.map((s, i) => (i === 0 ? 0 : Math.max(0, s.startSec)));
  const kept: { shot: RenderShot; startSec: number; endSec: number }[] = [];
  sorted.forEach((shot, i) => {
    const startSec = cuts[i]!;
    const endSec = i === sorted.length - 1 ? totalSec : Math.min(totalSec, cuts[i + 1]!);
    if (endSec - startSec > 1e-6) kept.push({ shot, startSec, endSec });
  });
  if (kept.length > 0) kept[0]!.startSec = 0;
  for (let i = 0; i < kept.length - 1; i++) kept[i]!.endSec = kept[i + 1]!.startSec;
  if (kept.length > 0) kept[kept.length - 1]!.endSec = totalSec;

  const fades = kept.map((k, i) => {
    if (i === 0) return 0;
    const prev = kept[i - 1]!;
    return Math.max(0, Math.min(crossfadeSec, (prev.endSec - prev.startSec) / 2, (k.endSec - k.startSec) / 2));
  });
  return kept.map((k, i) => {
    const fadeIn = fades[i]!;
    const fadeOutNext = i < kept.length - 1 ? fades[i + 1]! : 0;
    return {
      shot: k.shot,
      startSec: k.startSec,
      endSec: k.endSec,
      enterSec: Math.max(0, k.startSec - fadeIn / 2),
      exitSec: Math.min(totalSec, k.endSec + fadeOutNext / 2),
      fadeInSec: fadeIn,
    };
  });
}

export interface ClipFit {
  playbackRate: number;
  /** Seconds of the slot during which the clip plays. */
  playSec: number;
  /** Seconds of the slot spent holding the last frame. */
  holdSec: number;
}

/** Longer clips are trimmed; shorter ones slow down to at most MAX_SLOWDOWN and then hold. */
export function fitClip(clipDurationSec: number | null, slotSec: number, maxSlowdown = MAX_SLOWDOWN): ClipFit {
  if (clipDurationSec === null || !(clipDurationSec > 0) || clipDurationSec >= slotSec) {
    return { playbackRate: 1, playSec: slotSec, holdSec: 0 };
  }
  const playbackRate = Math.max(maxSlowdown, clipDurationSec / slotSec);
  const playSec = Math.min(slotSec, clipDurationSec / playbackRate);
  return { playbackRate, playSec, holdSec: Math.max(0, slotSec - playSec) };
}

export interface ClipFramePlan {
  playbackRate: number;
  /** Frames (relative to the slot) during which the clip plays. */
  playFrames: number;
  holdFrames: number;
  /** Slot-relative frame shown during the hold; its source time is safely inside the clip. */
  freezeAt: number;
}

/** Margin kept before the clip's end so the frozen frame always decodes (container durations overshoot). */
const CLIP_END_MARGIN_SEC = 0.06;

export function clipFramePlan(clipDurationSec: number | null, slotFrames: number, fps: number): ClipFramePlan {
  const usable = clipDurationSec === null ? null : Math.max(1 / fps, clipDurationSec - CLIP_END_MARGIN_SEC);
  const fit = fitClip(usable, slotFrames / fps);
  if (fit.holdSec === 0 || usable === null) {
    return { playbackRate: fit.playbackRate, playFrames: slotFrames, holdFrames: 0, freezeAt: slotFrames - 1 };
  }
  const playFrames = Math.max(1, Math.min(slotFrames, Math.floor((usable / fit.playbackRate) * fps)));
  return {
    playbackRate: fit.playbackRate,
    playFrames,
    holdFrames: slotFrames - playFrames,
    freezeAt: playFrames - 1,
  };
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Sine ease-in-out blended with linear so the camera never fully stops at a crossfade. */
export function easeKenBurns(p: number): number {
  const x = clamp(p, 0, 1);
  return 0.35 * x + 0.65 * (0.5 - 0.5 * Math.cos(Math.PI * x));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0;
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export interface FrameTransform {
  scale: number;
  /** Translation as a fraction of the frame size. */
  x: number;
  y: number;
}

/**
 * Interpolate a Ken Burns plan. Translation is clamped so the scaled image always
 * covers the frame (no black edges whatever plan the shot planner produced).
 */
export function kenBurnsTransform(plan: KenBurnsPlan, progress: number): FrameTransform {
  const e = easeKenBurns(progress);
  const scale = Math.max(1, lerp(plan.fromScale, plan.toScale, e));
  const maxShift = Math.max(0, (scale - 1) / 2 - 1e-4);
  return {
    scale,
    x: clamp(lerp(plan.fromX, plan.toX, e), -maxShift, maxShift),
    y: clamp(lerp(plan.fromY, plan.toY, e), -maxShift, maxShift),
  };
}

/**
 * The blurred depth layer behind a still moves less than the sharp layer (it is "further away"),
 * and is scaled up a little so its blurred edges never show.
 */
export function depthLayerTransform(fg: FrameTransform, depth = 0.55, overscan = 0.08): FrameTransform {
  const scale = 1 + overscan + (fg.scale - 1) * depth;
  const maxShift = Math.max(0, (scale - 1) / 2 - 1e-4);
  return {
    scale,
    x: clamp(fg.x * depth, -maxShift, maxShift),
    y: clamp(fg.y * depth, -maxShift, maxShift),
  };
}

export interface BrandTimeline {
  intro: TimeWindow | null;
  outro: TimeWindow | null;
  cta: TimeWindow | null;
}

/**
 * Intro and outro are overlays on the same timeline (not inserted segments), so the
 * branded and clean renders share durations and narration sync.
 */
export function brandTimeline(totalSec: number, brand: Pick<BrandKit, "intro" | "outro" | "ctaText"> | null): BrandTimeline {
  if (!brand || totalSec <= 0) return { intro: null, outro: null, cta: null };
  const intro =
    brand.intro.enabled && brand.intro.text.trim()
      ? { startSec: 0, endSec: Math.min(brand.intro.durationSec, totalSec * 0.4) }
      : null;
  const introEnd = intro?.endSec ?? 0;
  const outroStart = Math.max(introEnd, totalSec - brand.outro.durationSec);
  const outro = brand.outro.enabled && totalSec - outroStart >= 0.5 ? { startSec: outroStart, endSec: totalSec } : null;
  let cta: TimeWindow | null = null;
  if (brand.ctaText && brand.ctaText.trim()) {
    const endSec = outro ? outro.startSec : totalSec;
    const startSec = Math.max(introEnd, endSec - CTA_SEC);
    if (endSec - startSec >= 1) cta = { startSec, endSec };
  }
  return { intro, outro, cta };
}

export function secToFrame(sec: number, fps: number): number {
  return Math.round(sec * fps);
}

export function totalFrames(totalSec: number, fps: number): number {
  return Math.max(1, Math.round(totalSec * fps));
}
