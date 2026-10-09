import {
  ProviderError,
  snapDuration,
  type MediaInput,
  type ModelRef,
  type Usage,
  type VideoCapabilities,
  type VideoJobState,
  type VideoProvider,
  type VideoRequest,
  type VideoResolution,
} from "@media-studio/core";
import { configError } from "./errors";
import { decodeJobId, encodeJobId, requestJson } from "./http";
import { mediaInputToBytes, toDataUrl } from "./media";
import { videoUsage } from "./pricing";

const PROVIDER = "xai";
const BASE_URL = "https://api.x.ai/v1";
const BLOCKED = /moderat|content policy|usage guidelines|violat|not permitted|safety/i;

/** xAI charges $0.05 for a request its moderation rejects before generating (docs.x.ai pricing). */
export const XAI_PRE_GENERATION_REJECTION_FEE = 0.05;

/**
 * Image-to-video only (first frame, plus last frame on 1.5). Reference images exist only in
 * xAI's reference-to-video mode, which does not pin the first frame, so the adapter takes none.
 */
const CAPABILITIES: Record<string, VideoCapabilities> = {
  "grok-imagine-video-1.5": {
    minDurationSec: 1,
    maxDurationSec: 15,
    allowedDurationsSec: null,
    supportsLastFrame: true,
    maxReferenceImages: 0,
    resolutions: ["480p", "720p"],
    nativeAudio: true,
  },
  "grok-imagine-video-1.5-lite": {
    minDurationSec: 1,
    maxDurationSec: 15,
    allowedDurationsSec: null,
    supportsLastFrame: false,
    maxReferenceImages: 0,
    resolutions: ["480p", "720p"],
    nativeAudio: true,
  },
};

interface XaiStatus {
  status?: string | null;
  video?: { url?: string | null; duration?: number | null; respect_moderation?: boolean | null } | null;
  error?: { code?: string | null; message?: string | null } | null;
}

export interface XaiOptions {
  apiKey: string;
  fetch?: typeof fetch;
  baseUrl?: string;
}

export class XaiVideoProvider implements VideoProvider {
  readonly id = PROVIDER;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: XaiOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? BASE_URL).replace(/\/+$/, "");
    this.fetchImpl = opts.fetch ?? fetch;
  }

  capabilities(model: string): VideoCapabilities {
    const caps = CAPABILITIES[model];
    if (!caps) throw configError(PROVIDER, `xai video model "${model}" is not supported`);
    return caps;
  }

  private headers(): Record<string, string> {
    return { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" };
  }

  private async imageUrl(input: MediaInput): Promise<string> {
    if (input.kind === "url" && /^https?:/i.test(input.url)) return input.url;
    return toDataUrl(await mediaInputToBytes(input, this.fetchImpl));
  }

  async submit(req: VideoRequest): Promise<{ jobId: string }> {
    const model = req.model.model;
    const caps = this.capabilities(model);
    const duration = snapDuration(req.durationSec, caps);
    const resolution: VideoResolution = caps.resolutions.includes(req.resolution) ? req.resolution : "720p";
    const body: Record<string, unknown> = {
      model,
      prompt: req.prompt,
      image: { url: await this.imageUrl(req.firstFrame) },
      duration,
      aspect_ratio: req.aspectRatio,
      resolution,
      generate_audio: req.withAudio,
    };
    const useLastFrame = Boolean(req.lastFrame) && caps.supportsLastFrame;
    if (useLastFrame) body.last_frame = { url: await this.imageUrl(req.lastFrame!) };
    const inputImages = useLastFrame ? 2 : 1;
    const rejectionFee: Usage[] = [
      { provider: PROVIDER, model, operation: "moderation_rejection", units: 1, unitType: "request", costUsd: XAI_PRE_GENERATION_REJECTION_FEE },
    ];
    const { body: res } = await requestJson<{ request_id?: string | null }>(
      `${this.baseUrl}/videos/generations`,
      { method: "POST", headers: this.headers(), body: JSON.stringify(body) },
      { provider: PROVIDER, operation: "video submit", fetch: this.fetchImpl, blockedPattern: BLOCKED, blockedUsage: rejectionFee },
    );
    if (!res.request_id) throw new ProviderError("xai video submit returned no request_id", { kind: "retryable", provider: PROVIDER });
    return { jobId: encodeJobId(res.request_id, { res: resolution, dur: duration, imgs: inputImages }) };
  }

  async poll(jobId: string, model: ModelRef): Promise<VideoJobState> {
    const { vendorId, meta } = decodeJobId(jobId);
    const { status: http, body } = await requestJson<XaiStatus | null>(
      `${this.baseUrl}/videos/${encodeURIComponent(vendorId)}`,
      { method: "GET", headers: this.headers() },
      { provider: PROVIDER, operation: "video poll", fetch: this.fetchImpl },
    );
    // 202 = still generating (body may be empty)
    if (http === 202 || !body) return { status: "running" };
    const resolution = (meta.get("res") as VideoResolution | null) ?? "720p";
    const images = Number(meta.get("imgs")) || 1;
    const requested = Number(meta.get("dur")) || 0;
    const billed = () => videoUsage(PROVIDER, model.model, "image_to_video", body.video?.duration ?? requested, resolution, images);

    switch (body.status) {
      case "pending":
      case "queued":
        return { status: "running" };
      case "expired":
        return { status: "failed", error: "xai video request expired", retryable: true, usage: [] };
      case "failed": {
        const error = body.error?.message ?? body.error?.code ?? "generation failed";
        if (BLOCKED.test(error)) return { status: "blocked", reason: error, usage: billed() };
        return { status: "failed", error, retryable: true, usage: [] };
      }
    }
    if (body.status === "done" || (body.status == null && body.video?.url)) {
      // xAI bills generations that violate its usage guidelines, so a moderated clip still costs money.
      if (body.video?.respect_moderation === false) {
        return { status: "blocked", reason: "xai moderation rejected the generated video", usage: billed() };
      }
      if (!body.video?.url) return { status: "failed", error: "xai video done without a url", retryable: true, usage: billed() };
      return { status: "succeeded", video: { kind: "url", url: body.video.url, mimeType: "video/mp4" }, usage: billed() };
    }
    return { status: "running" };
  }
}
