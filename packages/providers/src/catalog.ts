import { FAL_KLING_I2V, FAL_KLING_O3_REF } from "./fal";

export type ProviderKind = "llm" | "image" | "video" | "tts" | "music";

export interface CatalogModel {
  kind: ProviderKind;
  provider: string;
  model: string;
  label: string;
  notes: string;
}

/** Environment variables each provider needs before it is registered. */
export const PROVIDER_ENV: Record<string, string[]> = {
  mock: [],
  anthropic: ["ANTHROPIC_API_KEY"],
  google: ["GEMINI_API_KEY"],
  minimax: ["MINIMAX_API_KEY", "MINIMAX_API_BASE"],
  xai: ["XAI_API_KEY"],
  fal: ["FAL_KEY"],
  elevenlabs: ["ELEVENLABS_API_KEY"],
};

/** Every model the registry can serve, for UI dropdowns. Prices: packages/core/src/pricing.ts. */
export const PROVIDER_CATALOG: CatalogModel[] = [
  // LLM
  { kind: "llm", provider: "anthropic", model: "claude-opus-5-5", label: "Claude Opus 5.5", notes: "Default for research, script and shot planning. $4/$20 per MTok; refusal fallback enabled." },
  { kind: "llm", provider: "anthropic", model: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", notes: "About half the cost of Opus. $2/$10 per MTok; refusal fallback enabled." },
  { kind: "llm", provider: "anthropic", model: "claude-haiku-5-5", label: "Claude Haiku 5.5", notes: "Fast checks (policy pre-check, keyframe QA). $0.10/$0.50 per MTok; no refusal fallback." },
  { kind: "llm", provider: "mock", model: "mock-llm", label: "Mock LLM (offline)", notes: "Deterministic, schema-valid output built from the prompt context. $0." },
  // Image
  { kind: "image", provider: "google", model: "gemini-nano-banana-2.1", label: "Nano Banana 2.1", notes: "Keyframes. ~$0.034/image at 1K; up to 14 references (4 characters)." },
  { kind: "image", provider: "google", model: "gemini-3-pro-image", label: "Nano Banana Pro", notes: "Character sheets. ~$0.134/image; up to 14 references (5 characters, 3 style)." },
  { kind: "image", provider: "mock", model: "mock-image", label: "Mock image (offline)", notes: "Gradient PNG labelled with the prompt. $0." },
  // Video
  { kind: "video", provider: "minimax", model: "MiniMax-H3-Max", label: "MiniMax H3 Max", notes: "Default hero clips. 5–15 s, 480p $0.05/s or 768p $0.08/s, first+last frame, native audio." },
  { kind: "video", provider: "minimax", model: "MiniMax-H3", label: "MiniMax H3", notes: "4–15 s at 768p, $0.08/s, first+last frame, native audio." },
  { kind: "video", provider: "google", model: "gemini-omni-1.1-flash", label: "Gemini Omni 1.1 Flash", notes: "Cinematic fallback. ~$0.10/s at 720p, up to ~10 s, audio always generated." },
  { kind: "video", provider: "xai", model: "grok-imagine-video-1.5", label: "Grok Imagine Video 1.5", notes: "1–15 s, 480p $0.08/s or 720p $0.14/s + $0.01/input image, last frame. Bills moderated generations." },
  { kind: "video", provider: "xai", model: "grok-imagine-video-1.5-lite", label: "Grok Imagine Video 1.5 Lite", notes: "Cheapest motion: 480p $0.02/s, 720p $0.03/s + $0.01/input image. Bills moderated generations." },
  { kind: "video", provider: "fal", model: FAL_KLING_I2V, label: "Kling 3.0 Standard (fal)", notes: "3–15 s at 720p, $0.084/s silent, end frame supported." },
  { kind: "video", provider: "fal", model: FAL_KLING_O3_REF, label: "Kling O3 Standard reference (fal)", notes: "3–15 s at 720p, $0.084/s silent, up to 4 reference images — good for stylized characters." },
  { kind: "video", provider: "mock", model: "mock-video", label: "Mock video (offline)", notes: "Push-in on the first frame, H.264 24 fps. Prompts containing [blocked] are refused. $0." },
  // TTS
  { kind: "tts", provider: "google", model: "gemini-3.8-flash-tts", label: "Gemini 3.8 Flash TTS", notes: "30 prebuilt voices, style direction. $0.0135/min (planned at the 2027 rate $0.027/min)." },
  { kind: "tts", provider: "elevenlabs", model: "eleven_v4", label: "ElevenLabs v4", notes: "Word timings from the vendor. ~$0.08 per 1K characters." },
  { kind: "tts", provider: "mock", model: "mock-tts", label: "Mock narration (offline)", notes: "Tone bursts at 2.5 words/s with word timings. $0." },
  // Music
  { kind: "music", provider: "google", model: "lyria-3.5", label: "Lyria 3.5", notes: "Instrumental tracks, $0.08 per track (MP3)." },
  { kind: "music", provider: "mock", model: "mock-music", label: "Mock music (offline)", notes: "Soft sustained chord. $0." },
];
