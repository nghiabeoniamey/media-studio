import { z } from "zod";

export const BeatPurpose = z.enum(["hook", "context", "rising", "turning_point", "resolution", "reflection", "cta"]);
export type BeatPurpose = z.infer<typeof BeatPurpose>;

export const ScriptBeat = z.object({
  id: z.string().regex(/^b\d+$/, "beat ids look like b1, b2, …"),
  purpose: BeatPurpose,
  /** Narration spoken over this beat. */
  text: z.string().min(1),
  /** e.g. "Exodus 17:1-7" when the beat paraphrases or quotes scripture. */
  scriptureRef: z.string().nullable(),
});
export type ScriptBeat = z.infer<typeof ScriptBeat>;

export const PlatformMeta = z.object({
  youtube: z.object({ title: z.string().max(100), description: z.string().max(5000), tags: z.array(z.string()).max(15) }),
  facebook: z.object({ caption: z.string().max(2200), hashtags: z.array(z.string()).max(5) }),
  instagram: z.object({ caption: z.string().max(2200), hashtags: z.array(z.string()).max(5) }),
  tiktok: z.object({ caption: z.string().max(2200), hashtags: z.array(z.string()).max(5) }),
});
export type PlatformMeta = z.infer<typeof PlatformMeta>;

export const Script = z.object({
  title: z.string(),
  beats: z.array(ScriptBeat).min(2),
  /** Verse shown on screen near the end; quoted from the series' public-domain translation. */
  onScreenVerse: z.object({ text: z.string(), ref: z.string() }).nullable(),
  platformMeta: PlatformMeta,
});
export type Script = z.infer<typeof Script>;

/** Average narration pace used for planning (TTS output is measured afterwards). */
export const WORDS_PER_SECOND = 2.5;

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function narrationText(script: Pick<Script, "beats">): string {
  return script.beats.map((b) => b.text.trim()).join(" ");
}

export function estimateNarrationSeconds(script: Pick<Script, "beats">, wordsPerSecond = WORDS_PER_SECOND): number {
  return countWords(narrationText(script)) / wordsPerSecond;
}

export function targetWordCount(durationSec: number, wordsPerSecond = WORDS_PER_SECOND): number {
  return Math.round(durationSec * wordsPerSecond);
}
