import { existsSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BIBLE_NICHE_SETTINGS, estimateWordTimings, kenBurnsFor } from "@media-studio/core";
import { alignScriptToAsr, alignWords, mergeTokensToWords, scriptWords } from "./align";
import { extractFrame, makeThumbnail, probeMedia, wrapText } from "./ffmpeg";
import { buildCaptionPages } from "./lib/captions";
import { SAFE_AREA, contains, overlayLayout, safeAreaBox } from "./lib/layout";
import { fitClip, kenBurnsTransform, planShotTimeline } from "./lib/timeline";
import { renderVideo } from "./render";
import { FIXTURE_SCRIPT, buildFixtureInput, makeFixtureAssets } from "./testing/fixtures";

const BROWSER =
  process.env.REMOTION_BROWSER_EXECUTABLE ?? "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";

describe("timeline math", () => {
  it("slows short clips down to at most 0.8x and then holds", () => {
    const fit = fitClip(2, 3);
    expect(fit.playbackRate).toBeGreaterThanOrEqual(0.8 - 1e-9);
    const exact = fitClip(3, 3);
    expect(exact.playbackRate).toBeCloseTo(1);
  });

  it("covers the whole duration with overlapping crossfades", () => {
    const shots = [0, 1, 2].map((i) => ({
      index: i,
      startSec: i * 2,
      durationSec: 2,
      kind: "still" as const,
      src: `/s${i}.png`,
      kenBurns: kenBurnsFor("push_in"),
      clipDurationSec: null,
    }));
    const tl = planShotTimeline(shots, 6);
    expect(tl).toHaveLength(3);
    expect(tl[0]!.startSec).toBe(0);
    expect(tl[2]!.endSec).toBeGreaterThanOrEqual(6 - 1e-9);
  });

  it("interpolates Ken Burns from start to end scale", () => {
    const plan = kenBurnsFor("push_in");
    expect(kenBurnsTransform(plan, 0).scale).toBeCloseTo(plan.fromScale);
    expect(kenBurnsTransform(plan, 1).scale).toBeCloseTo(plan.toScale);
  });
});

describe("captions and layout", () => {
  it("pages karaoke captions within the word limit", () => {
    const words = estimateWordTimings(FIXTURE_SCRIPT, 6, 0);
    const pages = buildCaptionPages(words, BIBLE_NICHE_SETTINGS.captions, { charsPerLine: 22, totalSec: 6 });
    expect(pages.length).toBeGreaterThan(1);
    for (const p of pages) expect(p.tokens.length).toBeLessThanOrEqual(BIBLE_NICHE_SETTINGS.captions.maxWordsPerPage);
  });

  it("keeps overlays inside the 9:16 safe area", () => {
    const safe = safeAreaBox(1080, 1920);
    expect(safe.y).toBeCloseTo(1920 * SAFE_AREA.top);
    const layout = overlayLayout({ width: 1080, height: 1920, captionPosition: "lower_third", watermarkPosition: "top_right", hasCta: true });
    for (const box of Object.values(layout)) if (box && typeof box === "object" && "x" in box) expect(contains(safe, box)).toBe(true);
  });

  it("wraps thumbnail titles", () => {
    expect(wrapText("Moses strikes the rock and water flows", 12).length).toBeGreaterThan(2);
  });
});

describe("alignment", () => {
  it("maps ASR tokens back onto the script's own words", () => {
    const asr = mergeTokensToWords([
      { text: " moses", startMs: 0, endMs: 400, timestampMs: 0, confidence: 1 },
      { text: " struck", startMs: 400, endMs: 800, timestampMs: 400, confidence: 1 },
      { text: " the", startMs: 800, endMs: 950, timestampMs: 800, confidence: 1 },
      { text: " rok", startMs: 950, endMs: 1300, timestampMs: 950, confidence: 1 },
    ]);
    const { words, matchRatio } = alignScriptToAsr(scriptWords("Moses struck the rock."), asr);
    expect(words.map((w) => w.word)).toEqual(["Moses", "struck", "the", "rock."]);
    expect(words[3]!.startSec).toBeCloseTo(0.95);
    expect(matchRatio).toBeGreaterThan(0.7);
  });

  it("falls back to estimated timings without whisper.cpp", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ms-align-"));
    const assets = await makeFixtureAssets(dir, { stills: 1, narrationSec: 4 });
    const res = await alignWords(assets.narration, FIXTURE_SCRIPT, { whisperDir: null });
    expect(res.method).toBe("estimate");
    expect(res.words).toHaveLength(scriptWords(FIXTURE_SCRIPT).length);
    expect(res.words.at(-1)!.endSec).toBeLessThanOrEqual(4.05);
  });
});

describe.skipIf(!existsSync(BROWSER))("renderVideo (headless Chromium)", () => {
  it("renders a branded 1080x1920 video with audio, frames and a thumbnail", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ms-render-"));
    const assets = await makeFixtureAssets(join(dir, "fx"), { stills: 2, narrationSec: 3.6, clipSec: 1.2, musicSec: 3 });
    const input = buildFixtureInput(assets, {
      totalSec: 4,
      plan: [
        { use: 0, durationSec: 1.4, movement: "push_in" },
        { use: "clip", durationSec: 1.3 },
        { use: 1, durationSec: 1.3, movement: "pan_left" },
      ],
      words: estimateWordTimings(FIXTURE_SCRIPT, 3.6, 0.1),
      branded: true,
      captionStyle: "karaoke_highlight",
      verse: { text: "He split the rock.", ref: "Psalm 105:41", startSec: 2.6, durationSec: 1.4 },
    });
    const out = join(dir, "out.mp4");
    const res = await renderVideo(input, { outputPath: out, browserExecutable: BROWSER, concurrency: 2 });
    const info = await probeMedia(out);
    expect([info.width, info.height]).toEqual([1080, 1920]);
    expect(info.durationSec).toBeGreaterThan(3.8);
    expect(info.durationSec).toBeLessThan(4.3);
    expect(info.hasAudio).toBe(true);
    expect(res.bytes).toBeGreaterThan(10_000);

    const frame = join(dir, "last.png");
    await extractFrame(out, "last", frame);
    expect(existsSync(frame)).toBe(true);
    const thumb = join(dir, "thumb.jpg");
    await makeThumbnail({ imagePath: assets.stills[0]!, outPath: thumb, title: "Water from the Rock" });
    const t = await probeMedia(thumb);
    expect([t.width, t.height]).toEqual([1080, 1920]);
  }, 300_000);
});
