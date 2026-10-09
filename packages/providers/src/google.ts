import { GoogleGenAI } from "@google/genai";
import {
  ProviderError,
  snapDuration,
  type ImageProvider,
  type ImageRequest,
  type ImageResult,
  type MediaInput,
  type ModelRef,
  type MusicProvider,
  type MusicRequest,
  type MusicResult,
  type TtsProvider,
  type TtsRequest,
  type TtsResult,
  type TtsVoice,
  type VideoCapabilities,
  type VideoJobState,
  type VideoProvider,
  type VideoRequest,
  type VideoResolution,
} from "@media-studio/core";
import { configError, toProviderError } from "./errors";
import { probeBytesDurationSec } from "./ffmpeg";
import { decodeJobId, encodeJobId, requestJson } from "./http";
import { base64ToBytes, bytesToBase64, imageDimensions, mediaInputToBytes, parseWav, pcmToWav, redactUrl, sniffMimeType } from "./media";
import { imageUsage, musicUsage, ttsUsage, videoUsage } from "./pricing";

const PROVIDER = "google";
const API_HOST = "generativelanguage.googleapis.com";
const BLOCKED = /safety|prohibited|blocked|policy|responsible ai|recitation|sensitive|not allowed to generate/i;

// ---------- Interactions API plumbing ----------

interface ContentLike {
  type: string;
  data?: string;
  uri?: string;
  mime_type?: string;
  sample_rate?: number;
  channels?: number;
  text?: string;
}

interface InteractionLike {
  id: string;
  status: string;
  steps?: { type: string; content?: ContentLike[]; error?: { code?: number; message?: string } }[];
  output_image?: ContentLike;
  output_audio?: ContentLike;
  output_video?: ContentLike;
  output_text?: string;
  errors?: { code?: string; message?: string }[];
  usage?: {
    total_input_tokens?: number;
    total_output_tokens?: number;
    output_tokens_by_modality?: { modality?: string; tokens?: number }[];
  };
}

/** The subset of `GoogleGenAI.interactions` the adapters use (injectable for tests). */
export interface GoogleInteractionsClient {
  create(params: Record<string, unknown>): Promise<InteractionLike>;
  get(id: string): Promise<InteractionLike>;
}

export interface GoogleOptions {
  apiKey: string;
  fetch?: typeof fetch;
  interactions?: GoogleInteractionsClient;
}

function interactionsClient(opts: GoogleOptions): GoogleInteractionsClient {
  if (opts.interactions) return opts.interactions;
  const ai = new GoogleGenAI({ apiKey: opts.apiKey, ...(opts.fetch ? { httpOptions: { fetch: opts.fetch } } : {}) });
  return ai.interactions as unknown as GoogleInteractionsClient;
}

function outputOf(interaction: InteractionLike, type: "image" | "audio" | "video"): ContentLike | null {
  const direct = interaction[`output_${type}`];
  if (direct && (direct.data || direct.uri)) return direct;
  const steps = interaction.steps ?? [];
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i]!;
    if (step.type !== "model_output") continue;
    const content = step.content ?? [];
    for (let j = content.length - 1; j >= 0; j--) {
      const c = content[j]!;
      if (c.type === type && (c.data || c.uri)) return c;
    }
  }
  return null;
}

function interactionText(interaction: InteractionLike): string {
  if (interaction.output_text) return interaction.output_text;
  return (interaction.steps ?? [])
    .filter((s) => s.type === "model_output")
    .flatMap((s) => s.content ?? [])
    .map((c) => (c.type === "text" ? (c.text ?? "") : ""))
    .join(" ")
    .trim();
}

function interactionErrors(interaction: InteractionLike): string {
  const messages = [
    ...(interaction.errors ?? []).map((e) => [e.code, e.message].filter(Boolean).join(": ")),
    ...(interaction.steps ?? []).map((s) => s.error?.message ?? ""),
  ].filter(Boolean);
  return messages.join("; ");
}

async function binaryPart(input: MediaInput): Promise<{ type: "image"; data: string; mime_type: string }> {
  const bin = await mediaInputToBytes(input);
  return { type: "image", data: bytesToBase64(bin.data), mime_type: bin.mimeType };
}

async function call<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw toProviderError(PROVIDER, err, { operation, blockedPattern: BLOCKED });
  }
}

/** A finished interaction that produced no usable media: content filter, or a hard failure. */
function missingOutput(interaction: InteractionLike, what: string): ProviderError {
  const detail = interactionErrors(interaction) || interactionText(interaction) || `status ${interaction.status}`;
  const kind = BLOCKED.test(detail) || interaction.status === "completed" ? "blocked" : interaction.status === "failed" ? "retryable" : "fatal";
  return new ProviderError(`google returned no ${what}: ${detail.slice(0, 300)}`, { kind, provider: PROVIDER });
}

// ---------- Image (Nano Banana) ----------

const IMAGE_MAX_REFERENCES: Record<string, number> = {
  // 10 object + 4 character references
  "gemini-nano-banana-2.1": 14,
  // 6 object + 5 character + 3 style references
  "gemini-3-pro-image": 14,
};

export class GoogleImageProvider implements ImageProvider {
  readonly id = PROVIDER;
  private readonly interactions: GoogleInteractionsClient;

  constructor(opts: GoogleOptions) {
    this.interactions = interactionsClient(opts);
  }

  maxReferences(model: string): number {
    const max = IMAGE_MAX_REFERENCES[model];
    if (max === undefined) throw configError(PROVIDER, `google image model "${model}" is not supported`);
    return max;
  }

  async generate(req: ImageRequest): Promise<ImageResult> {
    const model = req.model.model;
    const refs = req.references.slice(0, this.maxReferences(model));
    const prompt = req.negativePrompt ? `${req.prompt}\n\nAvoid: ${req.negativePrompt}.` : req.prompt;
    const input: Record<string, unknown>[] = [{ type: "text", text: prompt }];
    for (const ref of refs) {
      input.push({ type: "text", text: ref.label });
      input.push(await binaryPart(ref.image));
    }
    const imageSize = typeof req.model.options?.imageSize === "string" ? req.model.options.imageSize : "1K";
    const interaction = await call("image generation", () =>
      this.interactions.create({
        model,
        input,
        store: false,
        response_format: { type: "image", aspect_ratio: req.aspectRatio, image_size: imageSize },
      }),
    );
    const out = outputOf(interaction, "image");
    if (!out?.data) throw missingOutput(interaction, "image");
    const data = base64ToBytes(out.data);
    const dims = imageDimensions(data);
    return {
      image: { data, mimeType: out.mime_type ?? sniffMimeType(data) ?? "image/png" },
      width: dims?.width ?? null,
      height: dims?.height ?? null,
      usage: [imageUsage(PROVIDER, model, refs.length > 0 ? "image_with_references" : "image")],
    };
  }
}

// ---------- TTS ----------

export const GEMINI_PREBUILT_VOICES: TtsVoice[] = [
  ["Zephyr", "Bright"],
  ["Puck", "Upbeat"],
  ["Charon", "Informative"],
  ["Kore", "Firm"],
  ["Fenrir", "Excitable"],
  ["Leda", "Youthful"],
  ["Orus", "Firm"],
  ["Aoede", "Breezy"],
  ["Callirrhoe", "Easy-going"],
  ["Autonoe", "Bright"],
  ["Enceladus", "Breathy"],
  ["Iapetus", "Clear"],
  ["Umbriel", "Easy-going"],
  ["Algieba", "Smooth"],
  ["Despina", "Smooth"],
  ["Erinome", "Clear"],
  ["Algenib", "Gravelly"],
  ["Rasalgethi", "Informative"],
  ["Laomedeia", "Upbeat"],
  ["Achernar", "Soft"],
  ["Alnilam", "Firm"],
  ["Schedar", "Even"],
  ["Gacrux", "Mature"],
  ["Pulcherrima", "Forward"],
  ["Achird", "Friendly"],
  ["Zubenelgenubi", "Casual"],
  ["Vindemiatrix", "Gentle"],
  ["Sadachbia", "Lively"],
  ["Sadaltager", "Knowledgeable"],
  ["Sulafat", "Warm"],
].map(([name, description]) => ({ id: name!, name: name!, description: description! }));

const TTS_SAMPLE_RATE = 24_000;

function paceDirection(rate: number): string {
  if (Math.abs(rate - 1) < 0.03) return "";
  const pct = Math.round(Math.abs(rate - 1) * 100);
  return rate < 1 ? `speak about ${pct}% slower than a normal pace` : `speak about ${pct}% faster than a normal pace`;
}

export class GoogleTtsProvider implements TtsProvider {
  readonly id = PROVIDER;
  private readonly interactions: GoogleInteractionsClient;

  constructor(opts: GoogleOptions) {
    this.interactions = interactionsClient(opts);
  }

  async listVoices(_model: string): Promise<TtsVoice[]> {
    return GEMINI_PREBUILT_VOICES;
  }

  async synthesize(req: TtsRequest): Promise<TtsResult> {
    const { voice, text } = req;
    // Gemini 3.8 TTS reads `text` verbatim, so delivery direction goes in speech_metadata, not the transcript.
    const style = [voice.style.trim(), paceDirection(voice.speakingRate)].filter(Boolean).join("; ");
    const interaction = await call("tts", () =>
      this.interactions.create({
        model: voice.model,
        input: [
          {
            type: "user_input",
            content: [
              {
                type: "text",
                text,
                ...(style ? { annotations: [{ type: "speech_metadata", style }] } : {}),
              },
            ],
          },
        ],
        store: false,
        response_format: { type: "audio", mime_type: "audio/l16", sample_rate: TTS_SAMPLE_RATE },
        generation_config: { speech_config: [{ voice: voice.voiceId }] },
      }),
    );
    const out = outputOf(interaction, "audio");
    if (!out?.data) throw missingOutput(interaction, "audio");
    const raw = base64ToBytes(out.data);
    let wav: Uint8Array;
    let durationSec: number;
    const parsed = parseWav(raw);
    if (parsed) {
      wav = raw;
      durationSec = parsed.durationSec;
    } else {
      const rate = out.sample_rate ?? TTS_SAMPLE_RATE;
      const channels = out.channels ?? 1;
      wav = pcmToWav(raw, rate, channels, 16);
      durationSec = raw.byteLength / (rate * channels * 2);
    }
    return {
      audio: { data: wav, mimeType: "audio/wav" },
      durationSec,
      words: null,
      usage: [ttsUsage(PROVIDER, voice.model, durationSec, text.length, "audio_second")],
    };
  }
}

// ---------- Music (Lyria) ----------

export class GoogleMusicProvider implements MusicProvider {
  readonly id = PROVIDER;
  private readonly interactions: GoogleInteractionsClient;

  constructor(opts: GoogleOptions) {
    this.interactions = interactionsClient(opts);
  }

  async generate(req: MusicRequest): Promise<MusicResult> {
    const model = req.model.model;
    const seconds = Math.max(5, Math.round(req.durationSec));
    // Lyria takes length and structure from the prompt; there is no duration parameter.
    const input = `${req.prompt.trim().replace(/\.$/, "")}. Instrumental only, no vocals, no lyrics. Length: about ${seconds} seconds, ending with a gentle fade-out.`;
    const interaction = await call("music generation", () =>
      this.interactions.create({ model, input, store: false, response_format: { type: "audio" } }),
    );
    const out = outputOf(interaction, "audio");
    if (!out?.data) throw missingOutput(interaction, "audio");
    const data = base64ToBytes(out.data);
    const mimeType = sniffMimeType(data) ?? out.mime_type ?? "audio/mpeg";
    const wav = parseWav(data);
    const durationSec =
      wav?.durationSec ?? (await probeBytesDurationSec(data, mimeType === "audio/wav" ? "wav" : "mp3")) ?? req.durationSec;
    return { audio: { data, mimeType }, durationSec, usage: [musicUsage(PROVIDER, model)] };
  }
}

// ---------- Video (Gemini Omni) ----------

const OMNI_CAPABILITIES: Record<string, VideoCapabilities> = {
  "gemini-omni-1.1-flash": {
    minDurationSec: 2,
    maxDurationSec: 10,
    allowedDurationsSec: null,
    supportsLastFrame: true,
    maxReferenceImages: 6,
    resolutions: ["720p", "1080p"],
    nativeAudio: true,
  },
};

/** Billing rate published for Omni output: 5,792 tokens per second of 720p video. */
const OMNI_TOKENS_PER_SECOND_720P = 5792;

function nearestResolution(requested: VideoResolution, supported: VideoResolution[]): VideoResolution {
  if (supported.includes(requested)) return requested;
  const height = (r: VideoResolution) => Number.parseInt(r, 10);
  return supported.reduce((best, r) => (Math.abs(height(r) - height(requested)) < Math.abs(height(best) - height(requested)) ? r : best));
}

export class GoogleVideoProvider implements VideoProvider {
  readonly id = PROVIDER;
  private readonly interactions: GoogleInteractionsClient;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: GoogleOptions) {
    this.interactions = interactionsClient(opts);
    this.apiKey = opts.apiKey;
    this.fetchImpl = opts.fetch ?? fetch;
  }

  capabilities(model: string): VideoCapabilities {
    const caps = OMNI_CAPABILITIES[model];
    if (!caps) throw configError(PROVIDER, `google video model "${model}" is not supported`);
    return caps;
  }

  async submit(req: VideoRequest): Promise<{ jobId: string }> {
    const model = req.model.model;
    const caps = this.capabilities(model);
    const duration = snapDuration(req.durationSec, caps);
    const resolution = nearestResolution(req.resolution, caps.resolutions);
    const refs = (req.references ?? []).slice(0, caps.maxReferenceImages);
    const images: MediaInput[] = [req.firstFrame, ...(req.lastFrame ? [req.lastFrame] : []), ...refs];

    const sources = [`<FIRST_FRAME>@Image1`, ...(req.lastFrame ? [`<LAST_FRAME>@Image2`] : [])].join(" ");
    const refOffset = req.lastFrame ? 3 : 2;
    const references = refs.map((_, i) => `<IMAGE_REF_${i}>@Image${refOffset + i}`).join(" ");
    const text = [
      `[# Sources ${sources}]${references ? ` [# References ${references}]` : ""}`,
      req.prompt,
      "Use Image1 as the starting frame.",
      req.lastFrame ? "Use Image2 as the final frame." : "",
      refs.length ? "Use the remaining images as references for identity only, not as literal frames." : "",
      req.withAudio ? "" : "No dialogue, no narration, no music.",
    ]
      .filter(Boolean)
      .join(" ");

    const input: Record<string, unknown>[] = [];
    for (const image of images) input.push(await binaryPart(image));
    input.push({ type: "text", text });

    const interaction = await call("video submit", () =>
      this.interactions.create({
        model,
        input,
        background: true,
        store: true,
        response_format: {
          type: "video",
          aspect_ratio: req.aspectRatio,
          resolution,
          duration: `${duration}s`,
          delivery: "uri",
        },
        generation_config: { video_config: { task: "image_to_video" } },
      }),
    );
    if (!interaction.id) throw new ProviderError("google video submit returned no interaction id", { kind: "retryable", provider: PROVIDER });
    return { jobId: encodeJobId(interaction.id, { res: resolution, dur: duration }) };
  }

  async poll(jobId: string, model: ModelRef): Promise<VideoJobState> {
    const { vendorId, meta } = decodeJobId(jobId);
    const interaction = await call("video poll", () => this.interactions.get(vendorId));
    const resolution = (meta.get("res") as VideoResolution | null) ?? "720p";
    const requested = Number(meta.get("dur") ?? "0") || 0;

    switch (interaction.status) {
      case "queued":
        return { status: "queued" };
      case "in_progress":
      case "requires_action":
        return { status: "running" };
      case "completed":
        break;
      case "failed": {
        const detail = interactionErrors(interaction) || "generation failed";
        if (BLOCKED.test(detail)) return { status: "blocked", reason: detail, usage: [] };
        return { status: "failed", error: detail, retryable: true, usage: [] };
      }
      default:
        return { status: "failed", error: `interaction ${interaction.status}: ${interactionErrors(interaction)}`.trim(), retryable: false, usage: [] };
    }

    const out = outputOf(interaction, "video");
    if (!out) {
      const err = missingOutput(interaction, "video");
      return err.kind === "blocked"
        ? { status: "blocked", reason: err.message, usage: [] }
        : { status: "failed", error: err.message, retryable: err.kind === "retryable", usage: [] };
    }
    let bytes: Uint8Array;
    if (out.data) {
      bytes = base64ToBytes(out.data);
    } else {
      const ready = await this.fileReady(out.uri!);
      if (!ready) return { status: "running" };
      bytes = await this.download(out.uri!);
    }
    const videoTokens = interaction.usage?.output_tokens_by_modality?.find((m) => /video/i.test(m.modality ?? ""))?.tokens;
    const seconds = resolution === "720p" && videoTokens ? videoTokens / OMNI_TOKENS_PER_SECOND_720P : requested;
    return {
      status: "succeeded",
      video: { kind: "bytes", data: bytes, mimeType: out.mime_type ?? "video/mp4" },
      usage: videoUsage(PROVIDER, model.model, "image_to_video", Number(seconds.toFixed(3)), resolution, 0),
    };
  }

  private authHeaders(url: string): Record<string, string> {
    try {
      return new URL(url).host === API_HOST ? { "x-goog-api-key": this.apiKey } : {};
    } catch {
      return {};
    }
  }

  /** URI delivery: the file must be ACTIVE before it can be downloaded. */
  private async fileReady(uri: string): Promise<boolean> {
    const name = /\/(files\/[^/:?]+)/.exec(uri)?.[1];
    if (!name) return true;
    const { body } = await requestJson<{ state?: string; error?: { message?: string } }>(
      `https://${API_HOST}/v1beta/${name}`,
      { headers: this.authHeaders(`https://${API_HOST}/`) },
      { provider: PROVIDER, operation: "file status", fetch: this.fetchImpl },
    );
    if (body.state === "FAILED") {
      throw new ProviderError(`google video file ${name} failed processing: ${body.error?.message ?? ""}`, { kind: "retryable", provider: PROVIDER });
    }
    return body.state === undefined || body.state === "ACTIVE";
  }

  private async download(uri: string): Promise<Uint8Array> {
    let res: Response;
    try {
      res = await this.fetchImpl(uri, { headers: this.authHeaders(uri), signal: AbortSignal.timeout(10 * 60_000) });
    } catch (err) {
      throw toProviderError(PROVIDER, err, { operation: "video download" });
    }
    if (!res.ok) {
      throw toProviderError(PROVIDER, Object.assign(new Error(`download ${redactUrl(uri)}`), { status: res.status }), {
        operation: "video download",
      });
    }
    return new Uint8Array(await res.arrayBuffer());
  }
}
