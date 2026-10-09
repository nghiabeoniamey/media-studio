import { z } from "zod";

export const Platform = z.enum(["youtube", "facebook", "instagram", "tiktok"]);
export type Platform = z.infer<typeof Platform>;
export const PLATFORMS = Platform.options;

/**
 * How much of a video is real AI motion versus animated stills.
 * - hybrid ("S2"): keyframes animated with Ken Burns/parallax plus a few hero clips.
 * - hybrid_plus ("S2+"): roughly 40% of runtime is AI motion.
 * - full_motion ("S1"): every shot is an AI video clip.
 */
export const ProductionStrategy = z.enum(["hybrid", "hybrid_plus", "full_motion"]);
export type ProductionStrategy = z.infer<typeof ProductionStrategy>;

export const UserRole = z.enum(["admin", "editor"]);
export type UserRole = z.infer<typeof UserRole>;

export const VideoStatus = z.enum([
  "draft",
  "researching",
  "scripting",
  "script_review",
  "generating",
  "rendering",
  "final_review",
  "approved",
  "scheduled",
  "published",
  "rejected",
  "failed",
  "cancelled",
]);
export type VideoStatus = z.infer<typeof VideoStatus>;

export const ReviewGate = z.enum(["script", "final"]);
export type ReviewGate = z.infer<typeof ReviewGate>;

export const ReviewDecision = z.enum(["approved", "changes_requested", "regenerate_shots", "rejected"]);
export type ReviewDecision = z.infer<typeof ReviewDecision>;

export const ReviewChannel = z.enum(["web", "telegram", "auto"]);
export type ReviewChannel = z.infer<typeof ReviewChannel>;

export const ShotKind = z.enum(["hero", "still"]);
export type ShotKind = z.infer<typeof ShotKind>;

export const ShotStatus = z.enum([
  "pending",
  "keyframe_ready",
  "clip_ready",
  "fallback_still",
  "failed",
]);
export type ShotStatus = z.infer<typeof ShotStatus>;

export const AssetKind = z.enum(["image", "video", "audio", "text", "json", "archive"]);
export type AssetKind = z.infer<typeof AssetKind>;

export const AssetRole = z.enum([
  "upload",
  "character_view",
  "location_ref",
  "style_ref",
  "keyframe",
  "clip",
  "narration",
  "music",
  "captions",
  "render_branded",
  "render_clean",
  "thumbnail",
  "logo",
  "export_package",
  "reference_video",
]);
export type AssetRole = z.infer<typeof AssetRole>;

export const PublishStatus = z.enum(["pending_manual", "queued", "publishing", "published", "failed", "skipped"]);
export type PublishStatus = z.infer<typeof PublishStatus>;

export const PlatformConnection = z.enum(["manual", "upload_post", "direct"]);
export type PlatformConnection = z.infer<typeof PlatformConnection>;

export const SensitiveFlagType = z.enum(["minor", "violence", "nudity", "real_person", "deity_depiction", "other"]);
export type SensitiveFlagType = z.infer<typeof SensitiveFlagType>;
