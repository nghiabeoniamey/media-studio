import {
  ProviderError,
  snapDuration,
  type MediaInput,
  type ModelRef,
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

const PROVIDER = "minimax";
/** MiniMax status code 1026 = "sensitive content" (prompt or image). */
const BLOCKED = /\(1026\)|sensitive content|content policy|violat/i;

/**
 * The adapter always runs image-to-video (first frame, optional last frame). MiniMax rejects
 * reference images in that mode (i2v and reference-to-video are mutually exclusive), so
 * maxReferenceImages is 0 here even though H3 accepts 9 in reference mode.
 */
const CAPABILITIES: Record<string, VideoCapabilities> = {
  "MiniMax-H3-Max": {
    minDurationSec: 5,
    maxDurationSec: 15,
    allowedDurationsSec: null,
    supportsLastFrame: true,
    maxReferenceImages: 0,
    resolutions: ["480p", "768p"],
    nativeAudio: true,
  },
  "MiniMax-H3": {
    minDurationSec: 4,
    maxDurationSec: 15,
    allowedDurationsSec: null,
    supportsLastFrame: true,
    maxReferenceImages: 0,
    resolutions: ["768p"],
    nativeAudio: true,
  },
};

const WIRE_RESOLUTION: Partial<Record<VideoResolution, string>> = { "480p": "480P", "768p": "768P" };

interface MinimaxTask {
  id?: string;
  status?: string;
  content?: { url?: string; file_id?: string };
  file_id?: string;
  resolution?: string;
  duration?: number;
  usage?: { output_seconds?: number; total_seconds?: number; input_image_count?: number };
  error?: { code?: number | string; message?: string } | string;
}

export interface MinimaxOptions {
  apiKey: string;
  baseUrl: string;
  fetch?: typeof fetch;
}

function minimaxErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as { error?: { message?: string }; base_resp?: { status_msg?: string; status_code?: number } };
  if (b.error?.message) return b.error.message;
  if (b.base_resp?.status_msg) return `${b.base_resp.status_msg} (${b.base_resp.status_code ?? "?"})`;
  return null;
}

function snapResolution(requested: VideoResolution, supported: VideoResolution[]): VideoResolution {
  if (supported.includes(requested)) return requested;
  // 720p/1080p requests map to the closest tier MiniMax offers
  const height = (r: VideoResolution) => Number.parseInt(r, 10);
  return supported.reduce((best, r) => (Math.abs(height(r) - height(requested)) < Math.abs(height(best) - height(requested)) ? r : best));
}

export class MinimaxVideoProvider implements VideoProvider {
  readonly id = PROVIDER;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: MinimaxOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.fetchImpl = opts.fetch ?? fetch;
  }

  capabilities(model: string): VideoCapabilities {
    const caps = CAPABILITIES[model];
    if (!caps) throw configError(PROVIDER, `minimax video model "${model}" is not supported`);
    return caps;
  }

  private headers(): Record<string, string> {
    return { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" };
  }

  /** Public URLs pass through; anything else is sent inline as a base64 data URL. */
  private async imageUrl(input: MediaInput): Promise<string> {
    if (input.kind === "url" && /^https?:/i.test(input.url)) return input.url;
    return toDataUrl(await mediaInputToBytes(input, this.fetchImpl));
  }

  async submit(req: VideoRequest): Promise<{ jobId: string }> {
    const model = req.model.model;
    const caps = this.capabilities(model);
    const duration = snapDuration(req.durationSec, caps);
    const resolution = snapResolution(req.resolution, caps.resolutions);
    const content: Record<string, unknown>[] = [
      { type: "text", text: req.prompt },
      { type: "image_url", image_url: { url: await this.imageUrl(req.firstFrame) }, role: "first_frame" },
    ];
    if (req.lastFrame) {
      content.push({ type: "image_url", image_url: { url: await this.imageUrl(req.lastFrame) }, role: "last_frame" });
    }
    const body: Record<string, unknown> = { model, content, duration, resolution: WIRE_RESOLUTION[resolution] };
    if (req.callbackUrl) body.callback_url = req.callbackUrl;
    const { body: res } = await requestJson<{ task_id?: string; base_resp?: { status_code?: number; status_msg?: string } }>(
      `${this.baseUrl}/v2/video_generation`,
      { method: "POST", headers: this.headers(), body: JSON.stringify(body) },
      { provider: PROVIDER, operation: "video submit", fetch: this.fetchImpl, blockedPattern: BLOCKED, errorMessage: minimaxErrorMessage },
    );
    if (!res.task_id) {
      const msg = res.base_resp?.status_msg ?? "no task_id in response";
      const blocked = BLOCKED.test(`${msg} (${res.base_resp?.status_code ?? ""})`);
      throw new ProviderError(`minimax video submit failed: ${msg}`, { kind: blocked ? "blocked" : "retryable", provider: PROVIDER });
    }
    const inputImages = req.lastFrame ? 2 : 1;
    return { jobId: encodeJobId(res.task_id, { res: resolution, dur: duration, imgs: inputImages }) };
  }

  async poll(jobId: string, model: ModelRef): Promise<VideoJobState> {
    const { vendorId, meta } = decodeJobId(jobId);
    const { body } = await requestJson<{ task?: MinimaxTask }>(
      `${this.baseUrl}/v2/query/video_generation/${encodeURIComponent(vendorId)}`,
      { method: "GET", headers: this.headers() },
      { provider: PROVIDER, operation: "video poll", fetch: this.fetchImpl, errorMessage: minimaxErrorMessage },
    );
    const task = body.task;
    if (!task) throw new ProviderError("minimax poll returned no task", { kind: "retryable", provider: PROVIDER });

    switch (task.status) {
      case "queued":
        return { status: "queued" };
      case "running":
      case "processing":
        return { status: "running" };
      case "succeeded":
      case "success":
        break;
      case "cancelled":
        return { status: "failed", error: "minimax task was cancelled", retryable: false, usage: [] };
      case "failed":
      case "fail": {
        const error = typeof task.error === "string" ? task.error : `${task.error?.message ?? "generation failed"} (${task.error?.code ?? "?"})`;
        if (BLOCKED.test(error)) return { status: "blocked", reason: error, usage: [] };
        return { status: "failed", error, retryable: true, usage: [] };
      }
      default:
        return { status: "running" };
    }

    const url = task.content?.url ?? (await this.fileUrl(task.content?.file_id ?? task.file_id));
    const resolution = (meta.get("res") as VideoResolution | null) ?? "768p";
    const seconds = task.usage?.output_seconds ?? task.duration ?? (Number(meta.get("dur")) || 0);
    const images = task.usage?.input_image_count ?? (Number(meta.get("imgs")) || 1);
    return {
      status: "succeeded",
      video: { kind: "url", url, mimeType: "video/mp4" },
      usage: videoUsage(PROVIDER, model.model, "image_to_video", seconds, resolution, images),
    };
  }

  /** Older task shapes return a file_id that must be exchanged for a download URL. */
  private async fileUrl(fileId: string | undefined): Promise<string> {
    if (!fileId) throw new ProviderError("minimax task succeeded without a video url or file_id", { kind: "retryable", provider: PROVIDER });
    const { body } = await requestJson<{ file?: { download_url?: string } }>(
      `${this.baseUrl}/v1/files/retrieve?file_id=${encodeURIComponent(fileId)}`,
      { method: "GET", headers: this.headers() },
      { provider: PROVIDER, operation: "file retrieve", fetch: this.fetchImpl, errorMessage: minimaxErrorMessage },
    );
    const url = body.file?.download_url;
    if (!url) throw new ProviderError(`minimax file ${fileId} has no download_url`, { kind: "retryable", provider: PROVIDER });
    return url;
  }
}
