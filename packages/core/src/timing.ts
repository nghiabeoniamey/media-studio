import type { WordTiming } from "./providers";
import { countWords } from "./script";

export interface ShotTiming {
  startSec: number;
  endSec: number;
  durationSec: number;
}

/**
 * Re-time shots to the real narration. Each shot covers a slice of the narration
 * (its `narration` text); we walk the global word timings in order and cut at the
 * word where the next shot's slice begins. If the shot slices and the spoken words
 * disagree in count (LLM paraphrase, TTS normalisation), indices are scaled
 * proportionally so cuts still land on word boundaries.
 */
export function fitShotsToNarration(
  shots: { narration: string }[],
  words: WordTiming[],
  audioDurationSec: number,
  minShotSec = 1.2,
): ShotTiming[] {
  if (shots.length === 0) return [];
  const counts = shots.map((s) => Math.max(1, countWords(s.narration)));
  const planned = counts.reduce((a, b) => a + b, 0);

  if (words.length === 0) {
    // No timings: split the audio proportionally to planned word counts.
    let t = 0;
    const proportional = counts.map((c, i) => {
      const end = i === counts.length - 1 ? audioDurationSec : t + (audioDurationSec * c) / planned;
      const timing = { startSec: t, endSec: end };
      t = end;
      return timing;
    });
    return enforceMinimum(proportional, minShotSec, audioDurationSec);
  }

  const scale = words.length / planned;
  const starts: number[] = [];
  let cumulative = 0;
  for (const c of counts) {
    const wordIndex = Math.min(words.length - 1, Math.round(cumulative * scale));
    starts.push(cumulative === 0 ? 0 : words[wordIndex]!.startSec);
    cumulative += c;
  }

  const raw = starts.map((start, i) => {
    const end = i === starts.length - 1 ? audioDurationSec : starts[i + 1]!;
    return { startSec: start, endSec: Math.max(start, end) };
  });
  return enforceMinimum(raw, minShotSec, audioDurationSec);
}

/** Merge time from neighbours so no shot is shorter than `min` (when the total allows). */
function enforceMinimum(timings: { startSec: number; endSec: number }[], min: number, total: number): ShotTiming[] {
  const n = timings.length;
  const effectiveMin = Math.min(min, total / n);
  const durations = timings.map((t) => t.endSec - t.startSec);
  for (let pass = 0; pass < n; pass++) {
    let changed = false;
    for (let i = 0; i < n; i++) {
      const deficit = effectiveMin - durations[i]!;
      if (deficit <= 1e-9) continue;
      // borrow from the longest neighbour
      const left = i > 0 ? durations[i - 1]! : -1;
      const right = i < n - 1 ? durations[i + 1]! : -1;
      const j = left >= right ? i - 1 : i + 1;
      if (j < 0 || j >= n) continue;
      const available = durations[j]! - effectiveMin;
      if (available <= 0) continue;
      const take = Math.min(deficit, available);
      durations[i]! += take;
      durations[j]! -= take;
      changed = true;
    }
    if (!changed) break;
  }
  let t = 0;
  return durations.map((d, i) => {
    const end = i === n - 1 ? total : t + d;
    const timing = { startSec: t, endSec: end, durationSec: end - t };
    t = end;
    return timing;
  });
}

/** Approximate word timings from text when no aligner is available (proportional to word length). */
export function estimateWordTimings(text: string, audioDurationSec: number, leadInSec = 0.1): WordTiming[] {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const weights = tokens.map((w) => Math.max(2, w.replace(/[^\p{L}\p{N}]/gu, "").length) + (/[.,;:!?]$/.test(w) ? 3 : 0));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const usable = Math.max(0, audioDurationSec - leadInSec);
  let t = leadInSec;
  return tokens.map((word, i) => {
    const d = (usable * weights[i]!) / totalWeight;
    const timing = { word, startSec: t, endSec: t + d };
    t += d;
    return timing;
  });
}
