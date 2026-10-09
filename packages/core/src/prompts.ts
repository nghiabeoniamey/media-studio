import { describeFraming, describeMovement, type CameraMovement } from "./camera";
import type { StylePreset } from "./niche";
import type { ShotCharacter, ShotSpec } from "./shot";

/**
 * Prompt builders for the consistency technique:
 *  1. every recurring character has a multi-view character sheet;
 *  2. every keyframe is generated with the character's best-matching views, the
 *     location reference and (when returning to a setup) the earlier keyframe as references;
 *  3. hero clips are image-to-video from that keyframe — never text-to-video —
 *     so identity and framing come from the still, and only motion is generated.
 */

export const CHARACTER_VIEWS = [
  "front",
  "three_quarter_left",
  "three_quarter_right",
  "profile_left",
  "back",
  "full_body",
] as const;
export type CharacterView = (typeof CHARACTER_VIEWS)[number];

const VIEW_TEXT: Record<CharacterView, string> = {
  front: "front view, facing the camera, neutral expression",
  three_quarter_left: "three-quarter view turned to the left",
  three_quarter_right: "three-quarter view turned to the right",
  profile_left: "left profile view",
  back: "view from behind",
  full_body: "full body, head to toe, standing, front view",
};

export interface CharacterInfo {
  name: string;
  appearance: string;
  wardrobe: string;
}

export interface LocationInfo {
  name: string;
  description: string;
  era: string;
}

export function buildCharacterSheetPrompt(style: StylePreset, character: CharacterInfo, view: CharacterView): string {
  return [
    style.promptPrefix,
    `Character reference sheet of ${character.name}: ${character.appearance}.`,
    `Wardrobe: ${character.wardrobe}.`,
    `${VIEW_TEXT[view]}. Single character only, plain light-grey studio background, even soft lighting, sharp focus, no text, no watermark.`,
    style.promptSuffix,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function characterLine(c: ShotCharacter, info: CharacterInfo | undefined): string {
  const look = info ? ` (${info.appearance}; wearing ${info.wardrobe})` : "";
  return `${c.name}${look} is ${c.action}, ${c.expression} expression, positioned ${c.position} of frame, facing ${c.facing}`;
}

export function buildKeyframePrompt(args: {
  style: StylePreset;
  shot: ShotSpec;
  characters: CharacterInfo[];
  location: LocationInfo | null;
  referenceLabels: string[];
}): { prompt: string; negativePrompt: string } {
  const { style, shot } = args;
  const byName = new Map(args.characters.map((c) => [c.name.toLowerCase(), c]));
  const people = shot.characters.map((c) => characterLine(c, byName.get(c.name.toLowerCase())));
  const loc = args.location
    ? `Setting: ${args.location.name} — ${args.location.description} (${args.location.era}).`
    : `Setting: ${shot.location}.`;
  const refs =
    args.referenceLabels.length > 0
      ? `Use the reference images for identity and setting: ${args.referenceLabels.join("; ")}. Keep faces, hair, beards and costumes exactly as in the references.`
      : "";
  const prompt = [
    style.promptPrefix,
    `${describeFraming(shot.camera)}, vertical 9:16 composition.`,
    shot.keyframePrompt,
    people.length ? `${people.join(". ")}.` : "No people in frame.",
    loc,
    `Time of day: ${shot.timeOfDay.replace("_", " ")}. Lighting: ${shot.lighting}. Mood: ${shot.mood}.`,
    style.colorGrade ? `Color grade: ${style.colorGrade}.` : "",
    refs,
    "No text, no captions, no watermark.",
    style.promptSuffix,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const negativePrompt = [style.negativePrompt, "text, watermark, extra limbs, deformed hands, duplicate characters"]
    .filter(Boolean)
    .join(", ");
  return { prompt, negativePrompt };
}

export function buildMotionPrompt(shot: ShotSpec): string {
  return [
    shot.motionPrompt,
    `Camera: ${describeMovement(shot.camera.movement)}.`,
    "Keep every character's face, hair, costume and proportions identical to the first frame. Do not add new people or text. Natural, physically plausible motion.",
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- reference selection ----------

export interface ViewAsset {
  view: CharacterView;
  assetId: string;
}

export interface ReferenceChoice {
  assetId: string;
  label: string;
}

function preferredViews(facing: ShotCharacter["facing"]): CharacterView[] {
  switch (facing) {
    case "camera":
      return ["front", "three_quarter_left", "three_quarter_right", "full_body"];
    case "left":
      return ["three_quarter_left", "profile_left", "front", "full_body"];
    case "right":
      return ["three_quarter_right", "front", "profile_left", "full_body"];
    case "away":
      return ["back", "full_body", "front"];
  }
}

/**
 * Pick reference images for a keyframe, most important first, capped at `max`:
 * primary view of each character → earlier keyframe of the matched setup → location ref
 * → secondary character views → one style ref.
 */
export function selectKeyframeReferences(args: {
  shot: ShotSpec;
  characterViews: Record<string, ViewAsset[]>;
  locationRefAssetId: string | null;
  matchSetupKeyframeAssetId: string | null;
  styleRefAssetIds: string[];
  max: number;
}): ReferenceChoice[] {
  const out: ReferenceChoice[] = [];
  const seen = new Set<string>();
  const push = (assetId: string | null | undefined, label: string) => {
    if (!assetId || seen.has(assetId) || out.length >= args.max) return;
    seen.add(assetId);
    out.push({ assetId, label });
  };
  const viewsFor = (name: string) =>
    args.characterViews[name] ?? args.characterViews[name.toLowerCase()] ?? findCaseInsensitive(args.characterViews, name);

  const secondary: ReferenceChoice[] = [];
  for (const c of args.shot.characters) {
    const views = viewsFor(c.name) ?? [];
    const ordered = preferredViews(c.facing)
      .map((v) => views.find((x) => x.view === v))
      .filter((x): x is ViewAsset => Boolean(x));
    const [first, second] = ordered;
    if (first) push(first.assetId, `Character: ${c.name} (${first.view.replace(/_/g, " ")})`);
    if (second) secondary.push({ assetId: second.assetId, label: `Character: ${c.name} (${second.view.replace(/_/g, " ")})` });
  }
  if (args.matchSetupKeyframeAssetId) {
    push(args.matchSetupKeyframeAssetId, "Earlier shot of the same setup: match framing, set dressing and lighting");
  }
  push(args.locationRefAssetId, `Location: ${args.shot.location}`);
  for (const s of secondary) push(s.assetId, s.label);
  if (args.styleRefAssetIds[0]) push(args.styleRefAssetIds[0], "Style reference: match rendering style and palette only");
  return out;
}

function findCaseInsensitive<T>(record: Record<string, T>, name: string): T | undefined {
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(record)) if (k.toLowerCase() === lower) return v;
  return undefined;
}

// ---------- Ken Burns ----------

export interface KenBurnsPlan {
  fromScale: number;
  toScale: number;
  /** Translation as a fraction of frame size; positive x moves the image right. */
  fromX: number;
  toX: number;
  fromY: number;
  toY: number;
}

/** Map a planned camera movement onto a still-image Ken Burns move so stills obey the same camera language. */
export function kenBurnsFor(movement: CameraMovement): KenBurnsPlan {
  const base = { fromScale: 1.08, toScale: 1.08, fromX: 0, toX: 0, fromY: 0, toY: 0 };
  switch (movement) {
    case "push_in":
    case "crane_down":
      return { ...base, fromScale: 1.0, toScale: 1.15 };
    case "pull_out":
    case "crane_up":
      return { ...base, fromScale: 1.15, toScale: 1.0 };
    case "pan_left":
    case "truck_left":
      return { ...base, fromScale: 1.15, toScale: 1.15, fromX: -0.04, toX: 0.04 };
    case "pan_right":
    case "truck_right":
    case "orbit":
      return { ...base, fromScale: 1.15, toScale: 1.15, fromX: 0.04, toX: -0.04 };
    case "tilt_up":
      return { ...base, fromScale: 1.15, toScale: 1.15, fromY: -0.04, toY: 0.04 };
    case "tilt_down":
      return { ...base, fromScale: 1.15, toScale: 1.15, fromY: 0.04, toY: -0.04 };
    case "handheld":
      return { ...base, fromScale: 1.06, toScale: 1.1, fromX: 0.01, toX: -0.01 };
    case "static":
      return { ...base, fromScale: 1.04, toScale: 1.08 };
  }
}
