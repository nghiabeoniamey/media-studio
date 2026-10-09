import { z } from "zod";

/**
 * Shared camera vocabulary. The shot planner (LLM) must pick from these values so
 * keyframe prompts, motion prompts and the Ken Burns renderer all speak the same
 * language — the backbone of keeping characters and camera angles consistent.
 */
export const ShotSize = z.enum([
  "extreme_wide",
  "wide",
  "full",
  "medium",
  "medium_close",
  "close_up",
  "extreme_close_up",
  "insert",
]);
export type ShotSize = z.infer<typeof ShotSize>;

export const CameraAngle = z.enum(["eye_level", "low", "high", "overhead", "dutch", "over_the_shoulder", "pov"]);
export type CameraAngle = z.infer<typeof CameraAngle>;

export const CameraMovement = z.enum([
  "static",
  "push_in",
  "pull_out",
  "pan_left",
  "pan_right",
  "tilt_up",
  "tilt_down",
  "truck_left",
  "truck_right",
  "orbit",
  "crane_up",
  "crane_down",
  "handheld",
]);
export type CameraMovement = z.infer<typeof CameraMovement>;

export const Lens = z.enum(["wide_24mm", "standard_35mm", "normal_50mm", "portrait_85mm", "telephoto_135mm"]);
export type Lens = z.infer<typeof Lens>;

/** Screen direction for the 180-degree rule: subjects keep moving/facing the same way across a scene. */
export const ScreenDirection = z.enum(["left_to_right", "right_to_left", "neutral"]);
export type ScreenDirection = z.infer<typeof ScreenDirection>;

export const TimeOfDay = z.enum(["dawn", "morning", "midday", "afternoon", "golden_hour", "dusk", "night"]);
export type TimeOfDay = z.infer<typeof TimeOfDay>;

export const CameraSpec = z.object({
  size: ShotSize,
  angle: CameraAngle,
  movement: CameraMovement,
  lens: Lens,
  screenDirection: ScreenDirection,
});
export type CameraSpec = z.infer<typeof CameraSpec>;

const SIZE_TEXT: Record<ShotSize, string> = {
  extreme_wide: "extreme wide establishing shot",
  wide: "wide shot",
  full: "full shot, head to toe",
  medium: "medium shot, waist up",
  medium_close: "medium close-up, chest up",
  close_up: "close-up on the face",
  extreme_close_up: "extreme close-up detail",
  insert: "insert shot of a detail or object",
};

const ANGLE_TEXT: Record<CameraAngle, string> = {
  eye_level: "eye-level camera",
  low: "low-angle camera looking up",
  high: "high-angle camera looking down",
  overhead: "top-down overhead camera",
  dutch: "dutch tilted angle",
  over_the_shoulder: "over-the-shoulder framing",
  pov: "point-of-view shot",
};

const LENS_TEXT: Record<Lens, string> = {
  wide_24mm: "24mm wide lens",
  standard_35mm: "35mm lens",
  normal_50mm: "50mm lens",
  portrait_85mm: "85mm portrait lens, shallow depth of field",
  telephoto_135mm: "135mm telephoto lens, compressed background",
};

const MOVEMENT_TEXT: Record<CameraMovement, string> = {
  static: "locked-off static camera",
  push_in: "slow push-in toward the subject",
  pull_out: "slow pull-out revealing the surroundings",
  pan_left: "slow pan to the left",
  pan_right: "slow pan to the right",
  tilt_up: "slow tilt up",
  tilt_down: "slow tilt down",
  truck_left: "camera trucks left alongside the subject",
  truck_right: "camera trucks right alongside the subject",
  orbit: "slow orbit around the subject",
  crane_up: "crane rising up",
  crane_down: "crane descending",
  handheld: "subtle handheld movement",
};

export function describeFraming(camera: CameraSpec): string {
  return `${SIZE_TEXT[camera.size]}, ${ANGLE_TEXT[camera.angle]}, ${LENS_TEXT[camera.lens]}`;
}

export function describeMovement(movement: CameraMovement): string {
  return MOVEMENT_TEXT[movement];
}
