import { z } from "zod";
import { CameraSpec, TimeOfDay } from "./camera";
import { ShotKind } from "./enums";

export const ShotCharacter = z.object({
  /** Must match a character name from the story brief / character library. */
  name: z.string(),
  action: z.string(),
  expression: z.string(),
  position: z.enum(["left", "center", "right", "background"]),
  facing: z.enum(["camera", "left", "right", "away"]),
});
export type ShotCharacter = z.infer<typeof ShotCharacter>;

export const ShotSpec = z.object({
  index: z.number().int().min(0),
  beatId: z.string(),
  kind: ShotKind,
  durationSec: z.number().min(1).max(15),
  /** The slice of narration heard during this shot. */
  narration: z.string(),
  camera: CameraSpec,
  characters: z.array(ShotCharacter).max(4),
  /** Must match a location name from the story brief / location library. */
  location: z.string(),
  timeOfDay: TimeOfDay,
  lighting: z.string(),
  mood: z.string(),
  /** Visual content only (subjects, setting, composition). Style prefix and camera text are added by code. */
  keyframePrompt: z.string(),
  /** Subject motion for hero clips, e.g. "Moses raises his staff; wind whips his robe". Camera motion is added by code. */
  motionPrompt: z.string(),
  continuity: z.object({
    /** Index of an earlier shot whose framing/location this shot must match (shot-reverse-shot, returning setups). */
    matchSetupOf: z.number().int().min(0).nullable(),
    /** Use the last frame of this earlier hero shot as the first frame (seamless action continuation). */
    continueFrom: z.number().int().min(0).nullable(),
  }),
});
export type ShotSpec = z.infer<typeof ShotSpec>;

export const ShotList = z.object({
  shots: z.array(ShotSpec).min(2),
});
export type ShotList = z.infer<typeof ShotList>;

export interface ShotListIssue {
  shotIndex: number | null;
  message: string;
}

/** Structural checks the LLM output must pass before any money is spent on generation. */
export function validateShotList(
  list: ShotList,
  opts: { beatIds: string[]; characterNames: string[]; locationNames: string[] },
): ShotListIssue[] {
  const issues: ShotListIssue[] = [];
  const beats = new Set(opts.beatIds);
  const chars = new Set(opts.characterNames.map((n) => n.toLowerCase()));
  const locs = new Set(opts.locationNames.map((n) => n.toLowerCase()));
  list.shots.forEach((shot, i) => {
    if (shot.index !== i) issues.push({ shotIndex: i, message: `index ${shot.index} should be ${i}` });
    if (!beats.has(shot.beatId)) issues.push({ shotIndex: i, message: `unknown beat ${shot.beatId}` });
    if (!locs.has(shot.location.toLowerCase())) issues.push({ shotIndex: i, message: `unknown location "${shot.location}"` });
    for (const c of shot.characters) {
      if (!chars.has(c.name.toLowerCase())) issues.push({ shotIndex: i, message: `unknown character "${c.name}"` });
    }
    for (const ref of [shot.continuity.matchSetupOf, shot.continuity.continueFrom]) {
      if (ref !== null && ref >= i) issues.push({ shotIndex: i, message: `continuity must point to an earlier shot (got ${ref})` });
    }
    if (shot.continuity.continueFrom !== null) {
      const prev = list.shots[shot.continuity.continueFrom];
      if (prev && prev.kind !== "hero") issues.push({ shotIndex: i, message: `continueFrom ${shot.continuity.continueFrom} is not a hero shot` });
    }
  });
  const covered = new Set(list.shots.map((s) => s.beatId));
  for (const id of opts.beatIds) if (!covered.has(id)) issues.push({ shotIndex: null, message: `beat ${id} has no shot` });
  return issues;
}

export function totalDuration(shots: Pick<ShotSpec, "durationSec">[]): number {
  return shots.reduce((sum, s) => sum + s.durationSec, 0);
}
