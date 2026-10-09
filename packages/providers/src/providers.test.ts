import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LLM_SCHEMAS,
  ProviderError,
  Script,
  ShotList,
  StoryBrief,
  allocateHeroShots,
  contextBlock,
  STRATEGY_DEFAULTS,
  validateShotList,
  type ModelRef,
  type ScriptContext,
  type ShotListContext,
  type StoryBriefContext,
  type VideoJobState,
} from "@media-studio/core";
import {
  MinimaxVideoProvider,
  createProviderRegistry,
  kindForStatus,
  parseWav,
  pcmToWav,
  wordsFromCharacterAlignment,
} from "./index";

const mock = (model: string): ModelRef => ({ provider: "mock", model, options: {} });

function probe(path: string): { duration: number; width?: number; height?: number; codec?: string } {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=width,height,codec_name:format=duration", "-of", "json", path]);
  const json = JSON.parse(out.toString()) as { streams: { width?: number; height?: number; codec_name?: string }[]; format: { duration: string } };
  const v = json.streams.find((s) => s.width) ?? json.streams[0]!;
  return { duration: Number(json.format.duration), width: v.width, height: v.height, codec: v.codec_name };
}

function tmpFile(name: string, data: Uint8Array): string {
  const dir = mkdtempSync(join(tmpdir(), "ms-prov-"));
  const path = join(dir, name);
  writeFileSync(path, data);
  return path;
}

describe("registry", () => {
  it("always has mock and only registers real providers with keys", () => {
    const reg = createProviderRegistry({ env: {} });
    expect(reg.llm("mock").id).toBe("mock");
    expect(reg.has("video", "minimax")).toBe(false);
    expect(() => reg.video("minimax")).toThrow(/MINIMAX_API_KEY/);
    try {
      reg.llm("anthropic");
    } catch (err) {
      expect((err as ProviderError).kind).toBe("config");
    }
    const configured = createProviderRegistry({ env: { MINIMAX_API_KEY: "k", MINIMAX_API_BASE: "https://api.minimax.io", GEMINI_API_KEY: "g" } });
    expect(configured.has("video", "minimax")).toBe(true);
    expect(configured.has("image", "google")).toBe(true);
    const cat = configured.catalog();
    expect(cat.find((c) => c.model === "MiniMax-H3-Max")?.configured).toBe(true);
    expect(cat.find((c) => c.model === "claude-opus-5-5")?.configured).toBe(false);
    expect(cat.filter((c) => c.provider === "mock").every((c) => c.configured)).toBe(true);
  });
});

describe("mock LLM end-to-end", () => {
  const reg = createProviderRegistry({ env: {} });
  const llm = reg.llm("mock");

  it("produces a brief, a script and a shot list that pass validation", async () => {
    const briefCtx: StoryBriefContext = {
      input: { kind: "topic", topic: "Moses strikes the rock at Rephidim", notes: "" },
      seriesFormat: "story_retelling",
      translation: "BSB",
      existingCharacters: [{ id: "c1", name: "Jesus", aliases: [] }],
      existingLocations: [],
      scripture: [{ ref: "Exodus 17:1-7", text: "The whole congregation of Israel set out from the Desert of Sin..." }],
      contentRules: [],
    };
    const brief = (
      await llm.generateObject({ model: mock("mock-llm"), system: "", prompt: `Research.\n${contextBlock(briefCtx)}`, schema: StoryBrief, schemaName: LLM_SCHEMAS.storyBrief })
    ).object;
    expect(brief.characters.length).toBeGreaterThan(0);
    expect(brief.locations.length).toBeGreaterThan(0);

    const scriptCtx: ScriptContext = {
      brief,
      seriesFormat: "story_retelling",
      translation: "BSB",
      targetDurationSec: 45,
      targetWords: 112,
      ctaText: "Follow for a Bible story every day",
      contentRules: [],
      revisionNotes: null,
      previousScript: null,
    };
    const script = (
      await llm.generateObject({ model: mock("mock-llm"), system: "", prompt: `Write.\n${contextBlock(scriptCtx)}`, schema: Script, schemaName: LLM_SCHEMAS.script })
    ).object;
    const words = script.beats.map((b) => b.text).join(" ").split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(112 * 0.85);
    expect(words).toBeLessThanOrEqual(112 * 1.15);
    expect(script.platformMeta.tiktok.hashtags.length).toBeLessThanOrEqual(5);

    const shotCtx: ShotListContext = {
      brief,
      script,
      targetDurationSec: 45,
      strategy: "hybrid",
      characterNames: brief.characters.map((c) => c.name),
      locationNames: brief.locations.map((l) => l.name),
    };
    const list = (
      await llm.generateObject({ model: mock("mock-llm"), system: "", prompt: `Plan.\n${contextBlock(shotCtx)}`, schema: ShotList, schemaName: LLM_SCHEMAS.shotList })
    ).object;
    const issues = validateShotList(list, { beatIds: script.beats.map((b) => b.id), characterNames: shotCtx.characterNames, locationNames: shotCtx.locationNames });
    expect(issues).toEqual([]);
    const total = list.shots.reduce((s, x) => s + x.durationSec, 0);
    expect(Math.abs(total - 45)).toBeLessThanOrEqual(4.5);
    const purposes = Object.fromEntries(script.beats.map((b) => [b.id, b.purpose]));
    const alloc = allocateHeroShots(list.shots, STRATEGY_DEFAULTS.hybrid, purposes);
    expect(alloc.shots.filter((s) => s.kind === "hero").length).toBeGreaterThanOrEqual(2);
  });
});

describe("mock media", () => {
  const reg = createProviderRegistry({ env: {} });

  it("renders a 9:16 PNG keyframe", async () => {
    const res = await reg.image("mock").generate({ model: mock("mock-image"), prompt: "Moses on a rock", aspectRatio: "9:16", references: [] });
    expect(res.image.mimeType).toBe("image/png");
    expect([res.width, res.height]).toEqual([768, 1376]);
    expect(res.usage.every((u) => u.costUsd === 0)).toBe(true);
  });

  it("runs a video job through running -> succeeded and honours [blocked]", async () => {
    const img = await reg.image("mock").generate({ model: mock("mock-image"), prompt: "frame", aspectRatio: "9:16", references: [] });
    const video = reg.video("mock");
    const req = { model: mock("mock-video"), prompt: "push in", firstFrame: { kind: "bytes" as const, ...img.image }, durationSec: 3, resolution: "720p" as const, aspectRatio: "9:16" as const, withAudio: false };
    const { jobId } = await video.submit(req);
    expect((await video.poll(jobId, req.model)).status).toBe("running");
    const done = (await video.poll(jobId, req.model)) as Extract<VideoJobState, { status: "succeeded" }>;
    expect(done.status).toBe("succeeded");
    if (done.video.kind !== "bytes") throw new Error("expected bytes");
    const info = probe(tmpFile("clip.mp4", done.video.data));
    expect(info.codec).toBe("h264");
    expect(info.height! > info.width!).toBe(true);
    expect(info.duration).toBeGreaterThan(2.5);

    const blocked = await video.submit({ ...req, prompt: "[blocked] scene" });
    expect((await video.poll(blocked.jobId, req.model)).status).toBe("blocked");
  }, 60_000);

  it("speaks with plausible duration and word timings", async () => {
    const text = "In the beginning God created the heavens and the earth.";
    const res = await reg.tts("mock").synthesize({ text, voice: { provider: "mock", model: "mock-tts", voiceId: "x", style: "", speakingRate: 1 } });
    expect(res.durationSec).toBeCloseTo(10 / 2.5, 0);
    expect(res.words).toHaveLength(10);
    expect(parseWav(res.audio.data)?.sampleRate).toBeGreaterThan(0);
  });

  it("generates music of the requested length", async () => {
    const res = await reg.music("mock").generate({ model: mock("mock-music"), prompt: "reverent strings", durationSec: 4 });
    expect(res.durationSec).toBeCloseTo(4, 0);
    expect(probe(tmpFile("m.wav", res.audio.data)).duration).toBeCloseTo(4, 0);
  });
});

describe("adapters (offline)", () => {
  it("classifies HTTP statuses", () => {
    expect(kindForStatus(429)).toBe("retryable");
    expect(kindForStatus(503)).toBe("retryable");
    expect(kindForStatus(401)).toBe("config");
    expect(kindForStatus(400)).toBe("fatal");
  });

  it("wraps PCM as a valid WAV", () => {
    const wav = pcmToWav(new Uint8Array(48_000), 24_000);
    const info = parseWav(wav);
    expect(info?.sampleRate).toBe(24_000);
    expect(info?.durationSec).toBeCloseTo(1, 2);
  });

  it("turns ElevenLabs character alignment into word timings", () => {
    const text = "He is risen";
    const chars = text.split("");
    const words = wordsFromCharacterAlignment({
      characters: chars,
      character_start_times_seconds: chars.map((_, i) => i * 0.1),
      character_end_times_seconds: chars.map((_, i) => i * 0.1 + 0.1),
    });
    expect(words.map((w) => w.word)).toEqual(["He", "is", "risen"]);
    expect(words[2]!.startSec).toBeCloseTo(0.6);
  });

  it("drives MiniMax submit/poll and prices the clip", async () => {
    const calls: { url: string; body?: string }[] = [];
    let polls = 0;
    const fakeFetch = (async (url: string | URL, init?: RequestInit) => {
      calls.push({ url: String(url), body: init?.body as string | undefined });
      const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { "content-type": "application/json" } });
      if (String(url).endsWith("/v2/video_generation")) return json({ task_id: "t-1" });
      polls += 1;
      return polls === 1
        ? json({ task: { status: "running" } })
        : json({ task: { status: "succeeded", content: { url: "https://cdn.example.com/v.mp4" }, usage: { output_seconds: 6 } } });
    }) as typeof fetch;
    const p = new MinimaxVideoProvider({ apiKey: "k", baseUrl: "https://api.minimax.io/", fetch: fakeFetch });
    const model: ModelRef = { provider: "minimax", model: "MiniMax-H3-Max", options: {} };
    const { jobId } = await p.submit({ model, prompt: "Moses raises his staff", firstFrame: { kind: "url", url: "https://media.example.com/k.png" }, durationSec: 5.6, resolution: "768p", aspectRatio: "9:16", withAudio: false });
    const sent = JSON.parse(calls[0]!.body!) as { model: string; duration: number; content: { role?: string }[] };
    expect(sent.model).toBe("MiniMax-H3-Max");
    expect(sent.content.some((c) => c.role === "first_frame")).toBe(true);
    expect((await p.poll(jobId, model)).status).toBe("running");
    const done = await p.poll(jobId, model);
    expect(done.status).toBe("succeeded");
    if (done.status === "succeeded") expect(done.usage[0]!.costUsd).toBeCloseTo(6 * 0.08, 3);
  });
});
