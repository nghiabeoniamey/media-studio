import type { VideoResolution } from "./niche";
import type { Usage } from "./providers";

/**
 * List prices used for estimates and for the cost ledger when a vendor does not
 * return its own charge. Verified 2026-10-09 — see docs/research/2026-10-09-synthesis.md.
 * Re-check vendor pages before changing budgets; prices move monthly.
 */
export const PRICING_AS_OF = "2026-10-09";

export interface LlmPrice {
  inputPerMTok: number;
  outputPerMTok: number;
  /** Multiplier applied when the Batch API is used. */
  batchMultiplier: number;
}

export interface ImagePrice {
  perImage: number;
}

export interface VideoPrice {
  perSecond: Partial<Record<VideoResolution, number>>;
  /** Extra charge per reference/input image beyond `freeReferenceImages`. */
  perReferenceImage: number;
  freeReferenceImages: number;
}

export interface TtsPrice {
  perMinute?: number;
  perThousandChars?: number;
}

export interface MusicPrice {
  perRequest: number;
}

export const LLM_PRICES: Record<string, LlmPrice> = {
  "anthropic:claude-opus-5-5": { inputPerMTok: 4, outputPerMTok: 20, batchMultiplier: 0.5 },
  "anthropic:claude-sonnet-5-5": { inputPerMTok: 2, outputPerMTok: 10, batchMultiplier: 0.5 },
  // Haiku 5.5 price applies to prompts up to 100K tokens.
  "anthropic:claude-haiku-5-5": { inputPerMTok: 0.1, outputPerMTok: 0.5, batchMultiplier: 0.5 },
  // Doubles on 2027-01-01.
  "google:gemini-3.8-flash": { inputPerMTok: 0.75, outputPerMTok: 3.75, batchMultiplier: 0.5 },
};

export const IMAGE_PRICES: Record<string, ImagePrice> = {
  // Nano Banana 2.1, 1K output (9:16 = 768x1376). Reference images add ~$0.002-0.004.
  "google:gemini-nano-banana-2.1": { perImage: 0.0336 },
  // Nano Banana Pro — character sheets.
  "google:gemini-3-pro-image": { perImage: 0.134 },
};

export const VIDEO_PRICES: Record<string, VideoPrice> = {
  "minimax:MiniMax-H3-Max": { perSecond: { "480p": 0.05, "768p": 0.08 }, perReferenceImage: 0.074, freeReferenceImages: 2 },
  "minimax:MiniMax-H3": { perSecond: { "768p": 0.08 }, perReferenceImage: 0.04, freeReferenceImages: 5 },
  "google:gemini-omni-1.1-flash": { perSecond: { "720p": 0.1, "1080p": 0.15 }, perReferenceImage: 0, freeReferenceImages: 0 },
  "xai:grok-imagine-video-1.5-lite": { perSecond: { "480p": 0.02, "720p": 0.03 }, perReferenceImage: 0.01, freeReferenceImages: 0 },
  "xai:grok-imagine-video-1.5": { perSecond: { "480p": 0.08, "720p": 0.14 }, perReferenceImage: 0.01, freeReferenceImages: 0 },
  "fal:fal-ai/kling-video/o3/standard/reference-to-video": { perSecond: { "720p": 0.084 }, perReferenceImage: 0, freeReferenceImages: 0 },
  "fal:fal-ai/kling-video/v3/standard/image-to-video": { perSecond: { "720p": 0.084 }, perReferenceImage: 0, freeReferenceImages: 0 },
};

export const TTS_PRICES: Record<string, TtsPrice> = {
  // $0.0135/min until 2026-12-31; planned at the 2027 rate.
  "google:gemini-3.8-flash-tts": { perMinute: 0.027 },
  "elevenlabs:eleven_v4": { perThousandChars: 0.08 },
};

export const MUSIC_PRICES: Record<string, MusicPrice> = {
  "google:lyria-3.5": { perRequest: 0.08 },
};

const FREE_PROVIDERS = new Set(["mock"]);

function key(provider: string, model: string): string {
  return `${provider}:${model}`;
}

export class UnknownPriceError extends Error {
  constructor(what: string) {
    super(`No price on file for ${what}; add it to packages/core/src/pricing.ts`);
    this.name = "UnknownPriceError";
  }
}

function lookup<T>(table: Record<string, T>, provider: string, model: string): T | null {
  if (FREE_PROVIDERS.has(provider)) return null;
  const price = table[key(provider, model)];
  if (!price) throw new UnknownPriceError(key(provider, model));
  return price;
}

export function llmCost(provider: string, model: string, inputTokens: number, outputTokens: number, batch = false): number {
  const p = lookup(LLM_PRICES, provider, model);
  if (!p) return 0;
  const raw = (inputTokens * p.inputPerMTok + outputTokens * p.outputPerMTok) / 1_000_000;
  return raw * (batch ? p.batchMultiplier : 1);
}

export function imageCost(provider: string, model: string, images = 1): number {
  const p = lookup(IMAGE_PRICES, provider, model);
  return p ? p.perImage * images : 0;
}

export function videoCost(
  provider: string,
  model: string,
  seconds: number,
  resolution: VideoResolution,
  referenceImages = 0,
): number {
  const p = lookup(VIDEO_PRICES, provider, model);
  if (!p) return 0;
  const perSecond = p.perSecond[resolution];
  if (perSecond === undefined) throw new UnknownPriceError(`${key(provider, model)} at ${resolution}`);
  const billableRefs = Math.max(0, referenceImages - p.freeReferenceImages);
  return perSecond * seconds + billableRefs * p.perReferenceImage;
}

export function ttsCost(provider: string, model: string, seconds: number, characters: number): number {
  const p = lookup(TTS_PRICES, provider, model);
  if (!p) return 0;
  if (p.perMinute !== undefined) return (seconds / 60) * p.perMinute;
  if (p.perThousandChars !== undefined) return (characters / 1000) * p.perThousandChars;
  throw new UnknownPriceError(key(provider, model));
}

export function musicCost(provider: string, model: string, requests = 1): number {
  const p = lookup(MUSIC_PRICES, provider, model);
  return p ? p.perRequest * requests : 0;
}

export function sumUsage(usage: Usage[]): number {
  return usage.reduce((sum, u) => sum + u.costUsd, 0);
}

/** Round to 1/10,000 of a dollar for storage and display. */
export function roundUsd(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
