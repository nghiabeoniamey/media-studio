import type { z } from "zod";
import type { ModelRef, VideoResolution, VoiceConfig } from "./niche";

/**
 * Provider contracts. Every external AI service sits behind one of these
 * interfaces so the pipeline never depends on a specific vendor (models are
 * being retired every few months — see docs/DECISIONS.md).
 */

export interface BinaryData {
  data: Uint8Array;
  mimeType: string;
}

export type MediaInput =
  | { kind: "bytes"; data: Uint8Array; mimeType: string }
  | { kind: "url"; url: string; mimeType?: string };

export type UnitType =
  | "input_token"
  | "output_token"
  | "image"
  | "reference_image"
  | "video_second"
  | "audio_second"
  | "character"
  | "request";

/** One billable line. Providers report units; cost comes from the pricing table unless the vendor returns it. */
export interface Usage {
  provider: string;
  model: string;
  operation: string;
  units: number;
  unitType: UnitType;
  costUsd: number;
}

export type ProviderErrorKind = "retryable" | "blocked" | "fatal" | "config";

/**
 * - retryable: transient (rate limit, 5xx, timeout) — the workflow retries with backoff.
 * - blocked: content policy refusal — do not retry the same prompt; fall back (e.g. Ken Burns).
 * - fatal: bad request / unsupported input — surface to the user.
 * - config: missing API key or unknown model.
 */
export class ProviderError extends Error {
  readonly kind: ProviderErrorKind;
  readonly provider: string;
  /** Usage that was still billed (some vendors charge for blocked generations). */
  readonly usage: Usage[];

  constructor(
    message: string,
    opts: { kind: ProviderErrorKind; provider: string; usage?: Usage[]; cause?: unknown },
  ) {
    super(message, { cause: opts.cause });
    this.name = "ProviderError";
    this.kind = opts.kind;
    this.provider = opts.provider;
    this.usage = opts.usage ?? [];
  }
}

export function isProviderError(err: unknown): err is ProviderError {
  return err instanceof Error && err.name === "ProviderError" && "kind" in err;
}

// ---------- LLM ----------

export interface LlmRequest<T> {
  model: ModelRef;
  system: string;
  prompt: string;
  /** Zod schema of the structured output. Providers convert it to JSON Schema. */
  schema: z.ZodType<T>;
  schemaName: string;
  images?: MediaInput[];
  maxOutputTokens?: number;
}

export interface LlmResult<T> {
  object: T;
  usage: Usage[];
}

export interface LlmProvider {
  readonly id: string;
  generateObject<T>(req: LlmRequest<T>): Promise<LlmResult<T>>;
}

// ---------- Image ----------

export type AspectRatio = "9:16" | "16:9" | "1:1" | "3:4" | "4:3";

export interface ImageReference {
  image: MediaInput;
  /** How the model should use it, e.g. "Character: Moses (front view)" or "Location: Rephidim camp". */
  label: string;
}

export interface ImageRequest {
  model: ModelRef;
  prompt: string;
  negativePrompt?: string;
  aspectRatio: AspectRatio;
  references: ImageReference[];
}

export interface ImageResult {
  image: BinaryData;
  width: number | null;
  height: number | null;
  usage: Usage[];
}

export interface ImageProvider {
  readonly id: string;
  /** Max reference images the model accepts in one request. */
  maxReferences(model: string): number;
  generate(req: ImageRequest): Promise<ImageResult>;
}

// ---------- Video ----------

export interface VideoRequest {
  model: ModelRef;
  prompt: string;
  firstFrame: MediaInput;
  lastFrame?: MediaInput | null;
  references?: MediaInput[];
  durationSec: number;
  resolution: VideoResolution;
  aspectRatio: "9:16" | "16:9";
  withAudio: boolean;
  /** Webhook the vendor calls on completion, when supported. Polling is always the fallback. */
  callbackUrl?: string;
}

export interface VideoCapabilities {
  minDurationSec: number;
  maxDurationSec: number;
  /** Some models only accept fixed durations (e.g. 5 or 10 s). Null = any value in range. */
  allowedDurationsSec: number[] | null;
  supportsLastFrame: boolean;
  maxReferenceImages: number;
  resolutions: VideoResolution[];
  nativeAudio: boolean;
}

export type VideoJobState =
  | { status: "queued" | "running" }
  | { status: "succeeded"; video: MediaInput; usage: Usage[] }
  | { status: "failed"; error: string; retryable: boolean; usage: Usage[] }
  | { status: "blocked"; reason: string; usage: Usage[] };

export interface VideoProvider {
  readonly id: string;
  capabilities(model: string): VideoCapabilities;
  submit(req: VideoRequest): Promise<{ jobId: string }>;
  poll(jobId: string, model: ModelRef): Promise<VideoJobState>;
}

/** Snap a requested duration to what the model accepts. */
export function snapDuration(requested: number, caps: VideoCapabilities): number {
  if (caps.allowedDurationsSec && caps.allowedDurationsSec.length > 0) {
    return caps.allowedDurationsSec.reduce((best, d) =>
      Math.abs(d - requested) < Math.abs(best - requested) ? d : best,
    );
  }
  return Math.min(caps.maxDurationSec, Math.max(caps.minDurationSec, Math.round(requested)));
}

// ---------- TTS ----------

export interface WordTiming {
  word: string;
  startSec: number;
  endSec: number;
}

export interface TtsRequest {
  voice: VoiceConfig;
  text: string;
}

export interface TtsResult {
  audio: BinaryData;
  durationSec: number;
  /** Word timings when the vendor returns them; otherwise alignment runs afterwards. */
  words: WordTiming[] | null;
  usage: Usage[];
}

export interface TtsVoice {
  id: string;
  name: string;
  description: string;
}

export interface TtsProvider {
  readonly id: string;
  synthesize(req: TtsRequest): Promise<TtsResult>;
  listVoices(model: string): Promise<TtsVoice[]>;
}

// ---------- Music ----------

export interface MusicRequest {
  model: ModelRef;
  prompt: string;
  durationSec: number;
}

export interface MusicResult {
  audio: BinaryData;
  durationSec: number;
  usage: Usage[];
}

export interface MusicProvider {
  readonly id: string;
  generate(req: MusicRequest): Promise<MusicResult>;
}

// ---------- Registry ----------

export interface ProviderRegistry {
  llm(id: string): LlmProvider;
  image(id: string): ImageProvider;
  video(id: string): VideoProvider;
  tts(id: string): TtsProvider;
  music(id: string): MusicProvider;
}
