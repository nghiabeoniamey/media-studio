import { NicheSettings, ProviderSelection, SeriesSettings, type VoiceConfig } from "./niche";

/** Production providers chosen in docs/DECISIONS.md (verified 2026-10-09). */
export const DEFAULT_PROVIDERS: ProviderSelection = ProviderSelection.parse({
  llm: { provider: "anthropic", model: "claude-opus-5-5", options: { effort: "high" } },
  llmFast: { provider: "anthropic", model: "claude-haiku-5-5", options: { effort: "low" } },
  characterSheet: { provider: "google", model: "gemini-3-pro-image" },
  keyframe: { provider: "google", model: "gemini-nano-banana-2.1" },
  video: {
    primary: { provider: "minimax", model: "MiniMax-H3-Max" },
    fallbacks: [
      { provider: "google", model: "gemini-omni-1.1-flash" },
      { provider: "xai", model: "grok-imagine-video-1.5-lite" },
    ],
    resolution: "768p",
  },
  tts: { provider: "google", model: "gemini-3.8-flash-tts" },
  music: { provider: "google", model: "lyria-3.5" },
});

/** Offline providers: every stage produces real media locally at $0 (for tests and demos). */
export const MOCK_PROVIDERS: ProviderSelection = ProviderSelection.parse({
  llm: { provider: "mock", model: "mock-llm" },
  llmFast: { provider: "mock", model: "mock-llm" },
  characterSheet: { provider: "mock", model: "mock-image" },
  keyframe: { provider: "mock", model: "mock-image" },
  video: { primary: { provider: "mock", model: "mock-video" }, fallbacks: [], resolution: "720p" },
  tts: { provider: "mock", model: "mock-tts" },
  music: { provider: "mock", model: "mock-music" },
});

export const BIBLE_NARRATOR_VOICE: VoiceConfig = {
  provider: "google",
  model: "gemini-3.8-flash-tts",
  voiceId: "Charon",
  style: "Warm, reverent, unhurried male storyteller. Gentle emphasis on key words, short pauses between sentences.",
  speakingRate: 1,
};

export const BIBLE_CONTENT_RULES = [
  "Retell the story in original words; quote scripture only inside the narrative and only from the series' public-domain translation.",
  "Stay faithful to the biblical text; never invent miracles, dialogue attributed to God or Jesus, or doctrine. Mark any dramatisation as such in the theological notes.",
  "Do not give personal life, medical, legal or financial advice. No fear-based or manipulative appeals.",
  "Never voice Jesus in the first person unless the series explicitly allows it; narrate in the third person.",
  "Depict Jesus in the traditional Western iconography: shoulder-length brown hair, short beard, kind eyes, white or cream robe, optional red or blue mantle.",
  "Avoid graphic violence: crucifixion and battles are shown through implication, silhouettes, hands, shadows or aftermath.",
  "Children may appear only fully clothed, non-distressed and in wholesome family contexts.",
  "Keep the call to action gentle (e.g. 'Follow for a Bible story every day'); never ask viewers to type a word to prove faith.",
];

export const BIBLE_NICHE_SETTINGS: NicheSettings = NicheSettings.parse({
  style: {
    kind: "cinematic_realistic",
    name: "Biblical epic",
    promptPrefix:
      "Cinematic film still from a reverent biblical epic, photorealistic, shot on 35mm film, natural skin texture, ancient Near East setting, period-accurate costumes,",
    promptSuffix: "Soft volumetric light, subtle film grain, high dynamic range.",
    negativePrompt: "modern objects, cartoon, anime, plastic skin, oversaturated, gore",
    colorGrade: "warm golden highlights, teal-tinted shadows, gentle contrast",
  },
  captions: {
    style: "karaoke_highlight",
    fontFamily: "Inter",
    fontSizePx: 68,
    highlightColor: "#F5C451",
    position: "lower_third",
    uppercase: false,
    maxWordsPerPage: 4,
  },
  brand: {
    ctaText: "Follow for a Bible story every day",
    watermarkPosition: "top_right",
    outro: { enabled: true, text: "Follow for a Bible story every day", durationSec: 2 },
    intro: { enabled: false, text: "", durationSec: 1.5 },
  },
  providers: DEFAULT_PROVIDERS,
  strategy: "hybrid",
  targetDurationSec: 45,
  monthlyBudgetUsd: 100,
  autoApproveScript: false,
  autoApproveFinal: false,
  timezone: "America/New_York",
  scheduleSlots: [
    { time: "07:30", days: [], platforms: ["youtube", "facebook", "instagram", "tiktok"] },
    { time: "19:30", days: [], platforms: ["youtube", "facebook", "instagram", "tiktok"] },
  ],
  defaultVoice: BIBLE_NARRATOR_VOICE,
  contentRules: BIBLE_CONTENT_RULES,
});

export const BIBLE_SERIES_PRESETS: { slug: string; name: string; settings: SeriesSettings }[] = [
  {
    slug: "bible-stories",
    name: "Bible Stories",
    settings: SeriesSettings.parse({ format: "story_retelling", bibleTranslation: "BSB" }),
  },
  {
    slug: "parables-of-jesus",
    name: "Parables of Jesus",
    settings: SeriesSettings.parse({ format: "parable", bibleTranslation: "BSB" }),
  },
  {
    slug: "catholic-saints",
    name: "Saints & Catholic Faith",
    settings: SeriesSettings.parse({
      format: "saint_of_the_day",
      bibleTranslation: "DRC",
      alwaysReviewScript: true,
      voice: {
        provider: "google",
        model: "gemini-3.8-flash-tts",
        voiceId: "Aoede",
        style: "Gentle, contemplative female narrator with a calm, prayerful cadence.",
        speakingRate: 0.95,
      },
    }),
  },
];

export const DEFAULT_BIBLE_CHARACTERS = [
  {
    name: "Jesus",
    aliases: ["Jesus Christ", "Christ", "Jesus of Nazareth", "the Lord"],
    appearance:
      "man in his early thirties, traditional Western depiction: shoulder-length wavy brown hair parted in the middle, short full brown beard, warm hazel eyes, gentle kind expression, olive skin, slender build, average height",
    wardrobe: "simple cream-white linen robe with a rope belt, deep red mantle draped over one shoulder, leather sandals",
  },
  {
    name: "Mary",
    aliases: ["Virgin Mary", "Mary, mother of Jesus", "Our Lady", "Blessed Virgin Mary"],
    appearance:
      "young woman with a serene, gentle face, dark brown eyes, olive skin, dark hair mostly covered by a veil, calm and humble expression",
    wardrobe: "light blue mantle over a soft white tunic, long veil",
  },
] as const;
