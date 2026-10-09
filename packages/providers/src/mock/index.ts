import {
  LLM_SCHEMAS,
  ProviderError,
  countWords,
  parseContextBlock,
  snapDuration,
  type ImageProvider,
  type ImageRequest,
  type ImageResult,
  type KeyframeQaContext,
  type LlmProvider,
  type LlmRequest,
  type LlmResult,
  type ModelRef,
  type MusicProvider,
  type MusicRequest,
  type MusicResult,
  type PolicyCheckContext,
  type ScriptContext,
  type ShotListContext,
  type StoryBriefContext,
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
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extensionForMime, mediaInputToBytes } from "../media";
import { imageUsage, llmUsage, musicUsage, ttsUsage, videoUsage } from "../pricing";
import { mockKeyframeQa, mockPolicyCheck, mockScript, mockShotList, mockStoryBrief } from "./llm";
import { MOCK_IMAGE_SIZES, renderMockClip, renderMockImage, renderMockMusic, renderMockSpeech } from "./media";
import { estimateTokens, hashHex } from "./util";

export { MOCK_IMAGE_SIZES } from "./media";

const PROVIDER = "mock";

function mockError(message: string, kind: ProviderError["kind"] = "fatal"): ProviderError {
  return new ProviderError(`mock: ${message}`, { kind, provider: PROVIDER });
}

// ---------- LLM ----------

export class MockLlmProvider implements LlmProvider {
  readonly id = PROVIDER;

  async generateObject<T>(req: LlmRequest<T>): Promise<LlmResult<T>> {
    const ctx = parseContextBlock<unknown>(req.prompt);
    const needsContext = req.schemaName !== LLM_SCHEMAS.keyframeQa;
    if (needsContext && (ctx === null || typeof ctx !== "object")) {
      throw mockError(`${req.schemaName} prompt has no <context> block to build a response from`);
    }
    let raw: unknown;
    switch (req.schemaName) {
      case LLM_SCHEMAS.storyBrief:
        raw = mockStoryBrief(ctx as StoryBriefContext);
        break;
      case LLM_SCHEMAS.script:
        raw = mockScript(ctx as ScriptContext);
        break;
      case LLM_SCHEMAS.shotList:
        raw = mockShotList(ctx as ShotListContext);
        break;
      case LLM_SCHEMAS.keyframeQa:
        raw = mockKeyframeQa(ctx as KeyframeQaContext | null);
        break;
      case LLM_SCHEMAS.policyCheck:
        raw = mockPolicyCheck(ctx as PolicyCheckContext);
        break;
      default:
        throw mockError(`no generator for schema "${req.schemaName}"`);
    }
    const object = req.schema.parse(raw);
    const usage = llmUsage(PROVIDER, req.model.model, req.schemaName, {
      input: estimateTokens(req.system + req.prompt) + (req.images?.length ?? 0) * 1_000,
      output: estimateTokens(JSON.stringify(object)),
    });
    return { object, usage };
  }
}

// ---------- Image ----------

export class MockImageProvider implements ImageProvider {
  readonly id = PROVIDER;

  maxReferences(_model: string): number {
    return 14;
  }

  async generate(req: ImageRequest): Promise<ImageResult> {
    const words = req.prompt.replace(/\s+/g, " ").trim().split(" ");
    const snippet = words.slice(0, 7).join(" ");
    const label = [`${req.model.model} ${req.aspectRatio}`, snippet.length > 48 ? `${snippet.slice(0, 47)}…` : snippet, `refs: ${req.references.length}`].join("\n");
    const data = await renderMockImage({ prompt: req.prompt, aspectRatio: req.aspectRatio, label });
    const { width, height } = MOCK_IMAGE_SIZES[req.aspectRatio];
    return {
      image: { data, mimeType: "image/png" },
      width,
      height,
      usage: [imageUsage(PROVIDER, req.model.model, req.references.length > 0 ? "image_with_references" : "image")],
    };
  }
}

// ---------- Video ----------

const MOCK_VIDEO_CAPABILITIES: VideoCapabilities = {
  minDurationSec: 1,
  maxDurationSec: 15,
  allowedDurationsSec: null,
  supportsLastFrame: true,
  maxReferenceImages: 4,
  resolutions: ["480p", "720p", "768p", "1080p"],
  nativeAudio: false,
};

interface MockJob {
  model: string;
  prompt: string;
  durationSec: number;
  resolution: VideoResolution;
  aspectRatio: "9:16" | "16:9";
  withAudio: boolean;
  frameFile: string;
  polls: number;
}

const JOB_ID = /^mock-[0-9a-f]{12}-[0-9a-f]{8}$/;

/**
 * Jobs live on disk (not in memory) so a worker restart mid-poll — which durable workflows
 * are designed to survive — still finds the job.
 */
export class MockVideoProvider implements VideoProvider {
  readonly id = PROVIDER;
  private readonly workDir: string;

  constructor(opts: { workDir?: string } = {}) {
    this.workDir = opts.workDir ?? join(tmpdir(), "media-studio-mock", "video");
  }

  capabilities(_model: string): VideoCapabilities {
    return MOCK_VIDEO_CAPABILITIES;
  }

  private jobDir(jobId: string): string {
    if (!JOB_ID.test(jobId)) throw mockError(`unknown video job ${jobId}`);
    return join(this.workDir, jobId);
  }

  async submit(req: VideoRequest): Promise<{ jobId: string }> {
    const durationSec = snapDuration(req.durationSec, MOCK_VIDEO_CAPABILITIES);
    const frame = await mediaInputToBytes(req.firstFrame);
    const jobId = `mock-${hashHex(`${req.model.model}|${req.prompt}|${durationSec}|${req.resolution}`)}-${randomUUID().replace(/-/g, "").slice(0, 8)}`;
    const dir = this.jobDir(jobId);
    await mkdir(dir, { recursive: true });
    const frameFile = `frame.${extensionForMime(frame.mimeType)}`;
    await writeFile(join(dir, frameFile), frame.data);
    const job: MockJob = {
      model: req.model.model,
      prompt: req.prompt,
      durationSec,
      resolution: req.resolution,
      aspectRatio: req.aspectRatio,
      withAudio: req.withAudio,
      frameFile,
      polls: 0,
    };
    await writeFile(join(dir, "job.json"), JSON.stringify(job));
    return { jobId };
  }

  async poll(jobId: string, model: ModelRef): Promise<VideoJobState> {
    const dir = this.jobDir(jobId);
    let job: MockJob;
    try {
      job = JSON.parse(await readFile(join(dir, "job.json"), "utf8")) as MockJob;
    } catch {
      throw mockError(`unknown video job ${jobId}`);
    }
    job.polls += 1;
    await writeFile(join(dir, "job.json"), JSON.stringify(job));
    if (job.prompt.includes("[blocked]")) {
      return { status: "blocked", reason: "mock content filter: prompt contains [blocked]", usage: [] };
    }
    if (job.polls === 1) return { status: "running" };
    const outPath = join(dir, "clip.mp4");
    if (!existsSync(outPath)) {
      try {
        await renderMockClip({
          framePath: join(dir, job.frameFile),
          outPath,
          durationSec: job.durationSec,
          resolution: job.resolution,
          aspectRatio: job.aspectRatio,
          withAudio: job.withAudio,
        });
      } catch (err) {
        return { status: "failed", error: `mock render failed: ${(err as Error).message}`, retryable: false, usage: [] };
      }
    }
    const data = new Uint8Array(await readFile(outPath));
    return {
      status: "succeeded",
      video: { kind: "bytes", data, mimeType: "video/mp4" },
      usage: videoUsage(PROVIDER, model.model, "image_to_video", job.durationSec, job.resolution, 0),
    };
  }
}

// ---------- TTS ----------

const MOCK_VOICES: TtsVoice[] = [
  { id: "mock-narrator", name: "Mock Narrator", description: "Offline tone bursts, one per word" },
  { id: "mock-soft", name: "Mock Soft", description: "Offline tone bursts, one per word" },
];

export class MockTtsProvider implements TtsProvider {
  readonly id = PROVIDER;

  async listVoices(_model: string): Promise<TtsVoice[]> {
    return MOCK_VOICES;
  }

  async synthesize(req: TtsRequest): Promise<TtsResult> {
    const words = countWords(req.text);
    if (words === 0) throw mockError("cannot synthesize empty text");
    const rate = req.voice.speakingRate > 0 ? req.voice.speakingRate : 1;
    const durationSec = Math.max(0.5, words / (2.5 * rate));
    const { wav, words: timings } = renderMockSpeech(req.text, durationSec);
    return {
      audio: { data: wav, mimeType: "audio/wav" },
      durationSec,
      words: timings,
      usage: [ttsUsage(PROVIDER, req.voice.model, durationSec, req.text.length, "audio_second")],
    };
  }
}

// ---------- Music ----------

export class MockMusicProvider implements MusicProvider {
  readonly id = PROVIDER;

  async generate(req: MusicRequest): Promise<MusicResult> {
    const durationSec = Math.max(1, Math.round(req.durationSec * 10) / 10);
    const data = await renderMockMusic(req.prompt, durationSec);
    return { audio: { data, mimeType: "audio/wav" }, durationSec, usage: [musicUsage(PROVIDER, req.model.model)] };
  }
}
