import { ApiError, createFalClient, type FalClient } from "@fal-ai/client";
import {
  ProviderError,
  snapDuration,
  type MediaInput,
  type ModelRef,
  type VideoCapabilities,
  type VideoJobState,
  type VideoProvider,
  type VideoRequest,
} from "@media-studio/core";
import { configError, errorMessage, toProviderError } from "./errors";
import { decodeJobId, encodeJobId } from "./http";
import { mediaInputToBytes, toDataUrl } from "./media";
import { videoUsage } from "./pricing";

const PROVIDER = "fal";
const BLOCKED = /content_policy|content policy|nsfw|safety|moderation|sensitive/i;

export const FAL_KLING_I2V = "fal-ai/kling-video/v3/standard/image-to-video";
export const FAL_KLING_O3_REF = "fal-ai/kling-video/o3/standard/reference-to-video";

const CAPABILITIES: Record<string, VideoCapabilities> = {
  [FAL_KLING_I2V]: {
    minDurationSec: 3,
    maxDurationSec: 15,
    allowedDurationsSec: null,
    supportsLastFrame: true,
    maxReferenceImages: 0,
    resolutions: ["720p"],
    nativeAudio: true,
  },
  // image_urls are capped at 4 (elements + images) by the endpoint schema.
  [FAL_KLING_O3_REF]: {
    minDurationSec: 3,
    maxDurationSec: 15,
    allowedDurationsSec: null,
    supportsLastFrame: true,
    maxReferenceImages: 4,
    resolutions: ["720p"],
    nativeAudio: true,
  },
};

type Duration = "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11" | "12" | "13" | "14" | "15";

export interface FalOptions {
  apiKey: string;
  fetch?: typeof fetch;
  client?: FalClient;
}

function falDetail(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { detail?: unknown } | undefined;
    const detail = body?.detail;
    if (Array.isArray(detail)) return detail.map((d: { type?: string; msg?: string }) => `${d.type ?? ""}: ${d.msg ?? ""}`).join("; ");
    if (typeof detail === "string") return detail;
  }
  return errorMessage(err);
}

export class FalVideoProvider implements VideoProvider {
  readonly id = PROVIDER;
  private readonly client: FalClient;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: FalOptions) {
    this.fetchImpl = opts.fetch ?? fetch;
    this.client = opts.client ?? createFalClient({ credentials: opts.apiKey, ...(opts.fetch ? { fetch: opts.fetch } : {}) });
  }

  capabilities(model: string): VideoCapabilities {
    const caps = CAPABILITIES[model];
    if (!caps) throw configError(PROVIDER, `fal video endpoint "${model}" is not supported`);
    return caps;
  }

  private async imageUrl(input: MediaInput): Promise<string> {
    if (input.kind === "url" && /^https?:/i.test(input.url)) return input.url;
    return toDataUrl(await mediaInputToBytes(input, this.fetchImpl));
  }

  async submit(req: VideoRequest): Promise<{ jobId: string }> {
    const model = req.model.model;
    const caps = this.capabilities(model);
    const duration = String(snapDuration(req.durationSec, caps)) as Duration;
    const input: Record<string, unknown> = {
      prompt: req.prompt,
      start_image_url: await this.imageUrl(req.firstFrame),
      duration,
      generate_audio: req.withAudio,
    };
    if (req.lastFrame) input.end_image_url = await this.imageUrl(req.lastFrame);
    if (model === FAL_KLING_O3_REF) {
      input.aspect_ratio = req.aspectRatio;
      const refs = (req.references ?? []).slice(0, caps.maxReferenceImages);
      if (refs.length > 0) {
        input.image_urls = await Promise.all(refs.map((r) => this.imageUrl(r)));
        const tags = refs.map((_, i) => `@Image${i + 1}`).join(", ");
        input.prompt = `${req.prompt} Keep character identity and costume consistent with ${tags}.`;
      }
    } else {
      input.negative_prompt = "blur, distortion, low quality, extra limbs, text, watermark";
    }
    try {
      const queued = await this.client.queue.submit(model, {
        input: input as never,
        ...(req.callbackUrl ? { webhookUrl: req.callbackUrl } : {}),
      });
      return { jobId: encodeJobId(queued.request_id, { dur: duration }) };
    } catch (err) {
      throw toProviderError(PROVIDER, err, { operation: "video submit", blockedPattern: BLOCKED });
    }
  }

  async poll(jobId: string, model: ModelRef): Promise<VideoJobState> {
    const { vendorId, meta } = decodeJobId(jobId);
    const endpoint = model.model;
    let status: { status: string; error?: unknown };
    try {
      status = (await this.client.queue.status(endpoint, { requestId: vendorId, logs: false })) as { status: string; error?: unknown };
    } catch (err) {
      throw toProviderError(PROVIDER, err, { operation: "video poll" });
    }
    if (status.status === "IN_QUEUE") return { status: "queued" };
    if (status.status === "IN_PROGRESS") return { status: "running" };
    if (typeof status.error === "string" && status.error) {
      return BLOCKED.test(status.error)
        ? { status: "blocked", reason: status.error, usage: [] }
        : { status: "failed", error: status.error, retryable: true, usage: [] };
    }

    let data: { video?: { url?: string; content_type?: string } };
    try {
      data = (await this.client.queue.result(endpoint, { requestId: vendorId })).data as typeof data;
    } catch (err) {
      const detail = falDetail(err);
      if (BLOCKED.test(detail)) return { status: "blocked", reason: detail, usage: [] };
      const pe = toProviderError(PROVIDER, err, { operation: "video result" });
      if (pe.kind === "config") throw pe;
      return { status: "failed", error: `${pe.message} ${detail}`.trim(), retryable: pe.kind === "retryable", usage: [] };
    }
    const url = data.video?.url;
    if (!url) throw new ProviderError("fal result has no video url", { kind: "retryable", provider: PROVIDER });
    const seconds = Number(meta.get("dur")) || 5;
    return {
      status: "succeeded",
      video: { kind: "url", url, mimeType: data.video?.content_type ?? "video/mp4" },
      usage: videoUsage(PROVIDER, endpoint, "image_to_video", seconds, "720p", 0),
    };
  }
}
