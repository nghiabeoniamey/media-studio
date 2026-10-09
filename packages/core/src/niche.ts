import { z } from "zod";
import { Platform, ProductionStrategy } from "./enums";

/** A provider + model pair. `options` carries provider-specific knobs (e.g. effort, voice, resolution). */
export const ModelRef = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  options: z.record(z.string(), z.unknown()).default({}),
});
export type ModelRef = z.infer<typeof ModelRef>;

export const VideoResolution = z.enum(["480p", "720p", "768p", "1080p"]);
export type VideoResolution = z.infer<typeof VideoResolution>;

export const ProviderSelection = z.object({
  /** Research, script and shot planning. */
  llm: ModelRef,
  /** Cheap/fast model for prompt expansion, policy pre-checks and QA. */
  llmFast: ModelRef,
  characterSheet: ModelRef,
  keyframe: ModelRef,
  video: z.object({
    primary: ModelRef,
    fallbacks: z.array(ModelRef).default([]),
    resolution: VideoResolution.default("768p"),
  }),
  tts: ModelRef,
  music: ModelRef,
});
export type ProviderSelection = z.infer<typeof ProviderSelection>;

export const StylePreset = z.object({
  kind: z.enum(["cinematic_realistic", "animation_3d", "illustration", "custom"]),
  name: z.string(),
  /** Prepended to every keyframe prompt, e.g. "Cinematic film still, 35mm film grain, ...". */
  promptPrefix: z.string(),
  promptSuffix: z.string().default(""),
  negativePrompt: z.string().default(""),
  colorGrade: z.string().default(""),
  /** Asset ids of style reference images passed to image models. */
  styleRefAssetIds: z.array(z.string().uuid()).default([]),
});
export type StylePreset = z.infer<typeof StylePreset>;

export const CaptionPreset = z.object({
  style: z.enum(["word_pop", "karaoke_highlight", "cinematic_subtitle", "minimal"]),
  fontFamily: z.string().default("Inter"),
  fontSizePx: z.number().int().min(24).max(160).default(72),
  textColor: z.string().default("#FFFFFF"),
  highlightColor: z.string().default("#FFD54A"),
  strokeColor: z.string().default("#000000"),
  strokeWidthPx: z.number().min(0).max(20).default(6),
  position: z.enum(["center", "lower_third", "bottom"]).default("lower_third"),
  uppercase: z.boolean().default(false),
  maxWordsPerPage: z.number().int().min(1).max(12).default(4),
});
export type CaptionPreset = z.infer<typeof CaptionPreset>;

export const BrandKit = z.object({
  logoAssetId: z.string().uuid().nullable().default(null),
  watermarkPosition: z.enum(["top_left", "top_right", "bottom_left", "bottom_right"]).default("top_right"),
  watermarkOpacity: z.number().min(0).max(1).default(0.7),
  ctaText: z.string().nullable().default(null),
  intro: z
    .object({ enabled: z.boolean(), text: z.string(), durationSec: z.number().min(0.5).max(4) })
    .default({ enabled: false, text: "", durationSec: 1.5 }),
  outro: z
    .object({ enabled: z.boolean(), text: z.string(), durationSec: z.number().min(0.5).max(5) })
    .default({ enabled: false, text: "", durationSec: 2 }),
  primaryColor: z.string().default("#1B1B1F"),
  accentColor: z.string().default("#E8B04A"),
  fontFamily: z.string().default("Inter"),
});
export type BrandKit = z.infer<typeof BrandKit>;

export const VoiceConfig = z.object({
  provider: z.string(),
  model: z.string(),
  voiceId: z.string(),
  /** Natural-language delivery direction, e.g. "warm, reverent, unhurried storyteller". */
  style: z.string().default(""),
  speakingRate: z.number().min(0.5).max(2).default(1),
});
export type VoiceConfig = z.infer<typeof VoiceConfig>;

const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "expected HH:mm");

export const ScheduleSlot = z.object({
  time: HHMM,
  /** 0 = Sunday … 6 = Saturday. Empty means every day. */
  days: z.array(z.number().int().min(0).max(6)).default([]),
  platforms: z.array(Platform).min(1),
});
export type ScheduleSlot = z.infer<typeof ScheduleSlot>;

export const StrategyParams = z.object({
  /** Fraction of runtime that should be real AI motion (hero clips). */
  heroTimeFraction: z.number().min(0).max(1),
  /** Minimum number of hero clips per video (YouTube "slideshow" policy guard). */
  minHeroShots: z.number().int().min(0),
  /** Hard cap on billed AI-video seconds per video, before retries. */
  maxHeroSecondsPerVideo: z.number().min(0),
});
export type StrategyParams = z.infer<typeof StrategyParams>;

export const STRATEGY_DEFAULTS: Record<ProductionStrategy, StrategyParams> = {
  hybrid: { heroTimeFraction: 0.22, minHeroShots: 2, maxHeroSecondsPerVideo: 15 },
  hybrid_plus: { heroTimeFraction: 0.4, minHeroShots: 3, maxHeroSecondsPerVideo: 30 },
  full_motion: { heroTimeFraction: 1, minHeroShots: 1, maxHeroSecondsPerVideo: 200 },
};

export const NicheSettings = z.object({
  style: StylePreset,
  captions: CaptionPreset,
  brand: BrandKit,
  providers: ProviderSelection,
  strategy: ProductionStrategy.default("hybrid"),
  strategyParams: StrategyParams.nullable().default(null),
  targetDurationSec: z.number().int().min(10).max(180).default(45),
  monthlyBudgetUsd: z.number().min(0).default(100),
  autoApproveScript: z.boolean().default(false),
  autoApproveFinal: z.boolean().default(false),
  timezone: z.string().default("America/New_York"),
  scheduleSlots: z.array(ScheduleSlot).default([]),
  /** Default narration voice; series can override. */
  defaultVoice: VoiceConfig,
  /** Rules appended to every script prompt (theology, tone, banned content). */
  contentRules: z.array(z.string()).default([]),
});
export type NicheSettings = z.infer<typeof NicheSettings>;

export function resolveStrategyParams(settings: Pick<NicheSettings, "strategy" | "strategyParams">): StrategyParams {
  return settings.strategyParams ?? STRATEGY_DEFAULTS[settings.strategy];
}

export const SeriesSettings = z.object({
  /** Narrative format the script writer follows, rotated across series to avoid "templated" content. */
  format: z.enum([
    "story_retelling",
    "parable",
    "miracle",
    "character_portrait",
    "saint_of_the_day",
    "verse_reflection",
    "prayer",
    "custom",
  ]),
  formatNotes: z.string().default(""),
  voice: VoiceConfig.nullable().default(null),
  /** Public-domain translation code, see @media-studio/bible (e.g. BSB, KJV, DRC, CPDV). */
  bibleTranslation: z.string().default("BSB"),
  llm: ModelRef.nullable().default(null),
  /** Force the script gate even when the niche auto-approves (e.g. Catholic series). */
  alwaysReviewScript: z.boolean().default(false),
  captions: CaptionPreset.nullable().default(null),
});
export type SeriesSettings = z.infer<typeof SeriesSettings>;
