import { z } from "zod";
import { SensitiveFlagType } from "./enums";
import { TimeOfDay } from "./camera";

export const StoryInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("topic"), topic: z.string().min(2).max(500), notes: z.string().max(4000).default("") }),
  z.object({ kind: z.literal("text"), text: z.string().min(20).max(30000), notes: z.string().max(4000).default("") }),
  z.object({ kind: z.literal("calendar"), entryId: z.string(), topic: z.string(), notes: z.string().default("") }),
  z.object({
    kind: z.literal("reference_url"),
    url: z.string().url(),
    /** What to learn from the reference (structure, hook, pacing, camera language). Content is never copied. */
    notes: z.string().max(4000).default(""),
  }),
]);
export type StoryInput = z.infer<typeof StoryInput>;

export const ScriptureRef = z.object({
  book: z.string(),
  chapter: z.number().int().min(1),
  verseStart: z.number().int().min(1),
  verseEnd: z.number().int().min(1),
});
export type ScriptureRef = z.infer<typeof ScriptureRef>;

export function formatScriptureRef(ref: ScriptureRef): string {
  const verses = ref.verseEnd > ref.verseStart ? `${ref.verseStart}-${ref.verseEnd}` : `${ref.verseStart}`;
  return `${ref.book} ${ref.chapter}:${verses}`;
}

export const BriefCharacter = z.object({
  name: z.string(),
  role: z.string(),
  /** Canonical look for character sheets: age, build, hair, beard, skin, eyes, distinguishing marks. */
  appearance: z.string(),
  wardrobe: z.string(),
  /** Set when the character matches an existing library character by name/alias. */
  existingCharacterId: z.string().nullable(),
});
export type BriefCharacter = z.infer<typeof BriefCharacter>;

export const BriefLocation = z.object({
  name: z.string(),
  description: z.string(),
  era: z.string(),
  timeOfDay: TimeOfDay,
  existingLocationId: z.string().nullable(),
});
export type BriefLocation = z.infer<typeof BriefLocation>;

export const SensitiveFlag = z.object({ type: SensitiveFlagType, note: z.string() });
export type SensitiveFlag = z.infer<typeof SensitiveFlag>;

/** Output of the research step. */
export const StoryBrief = z.object({
  title: z.string(),
  summary: z.string(),
  scriptureRefs: z.array(ScriptureRef),
  keyThemes: z.array(z.string()),
  characters: z.array(BriefCharacter),
  locations: z.array(BriefLocation),
  sensitiveFlags: z.array(SensitiveFlag),
  theologicalNotes: z.array(z.string()),
  hookIdeas: z.array(z.string()),
});
export type StoryBrief = z.infer<typeof StoryBrief>;
