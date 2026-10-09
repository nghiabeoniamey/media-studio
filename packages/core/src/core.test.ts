import { describe, expect, it } from "vitest";
import {
  BIBLE_NICHE_SETTINGS,
  DEFAULT_PROVIDERS,
  MOCK_PROVIDERS,
  STRATEGY_DEFAULTS,
  ShotList,
  allocateHeroShots,
  buildKeyframePrompt,
  buildMotionPrompt,
  canTransition,
  checkBudget,
  estimateVideoCost,
  estimateWordTimings,
  fitShotsToNarration,
  kenBurnsFor,
  llmCost,
  selectKeyframeReferences,
  snapDuration,
  validateShotList,
  videoCost,
  type ShotSpec,
} from "./index";

function shot(i: number, overrides: Partial<ShotSpec> = {}): ShotSpec {
  return {
    index: i,
    beatId: `b${i + 1}`,
    kind: "still",
    durationSec: 4,
    narration: "one two three four five six seven eight nine ten",
    camera: { size: "medium", angle: "eye_level", movement: "static", lens: "standard_35mm", screenDirection: "neutral" },
    characters: [{ name: "Moses", action: "standing", expression: "determined", position: "center", facing: "camera" }],
    location: "Rephidim",
    timeOfDay: "midday",
    lighting: "harsh sun",
    mood: "tense",
    keyframePrompt: "Moses stands on a rock",
    motionPrompt: "Moses raises his staff",
    continuity: { matchSetupOf: null, continueFrom: null },
    ...overrides,
  };
}

describe("pricing", () => {
  it("prices Claude Opus 5.5 per million tokens", () => {
    expect(llmCost("anthropic", "claude-opus-5-5", 1_000_000, 1_000_000)).toBeCloseTo(24);
    expect(llmCost("anthropic", "claude-opus-5-5", 1_000_000, 0, true)).toBeCloseTo(2);
  });
  it("charges extra MiniMax H3 Max reference images beyond the free two", () => {
    expect(videoCost("minimax", "MiniMax-H3-Max", 10, "768p", 4)).toBeCloseTo(0.8 + 2 * 0.074);
  });
  it("throws for unknown resolutions and models but is free for mocks", () => {
    expect(() => videoCost("minimax", "MiniMax-H3-Max", 5, "1080p")).toThrow(/No price/);
    expect(() => llmCost("anthropic", "made-up", 1, 1)).toThrow(/No price/);
    expect(videoCost("mock", "mock-video", 100, "1080p")).toBe(0);
  });
});

describe("allocateHeroShots", () => {
  const purposes = { b1: "hook", b2: "context", b3: "context", b4: "turning_point", b5: "reflection", b6: "cta" } as const;
  const shots = Array.from({ length: 6 }, (_, i) => shot(i, { durationSec: 5 }));

  it("keeps at least the minimum hero shots and respects the cap", () => {
    const res = allocateHeroShots(shots, STRATEGY_DEFAULTS.hybrid, purposes);
    const heroes = res.shots.filter((s) => s.kind === "hero");
    expect(heroes.length).toBeGreaterThanOrEqual(2);
    expect(res.heroSeconds).toBeLessThanOrEqual(STRATEGY_DEFAULTS.hybrid.maxHeroSecondsPerVideo);
    // hook and turning point win
    expect(heroes.map((h) => h.index)).toEqual(expect.arrayContaining([0, 3]));
  });

  it("never exceeds the cap even to satisfy the minimum", () => {
    const res = allocateHeroShots(shots, { heroTimeFraction: 0.5, minHeroShots: 3, maxHeroSecondsPerVideo: 9 }, purposes);
    expect(res.heroSeconds).toBeLessThanOrEqual(9);
    expect(res.notes.join(" ")).toMatch(/hero shot/);
  });

  it("drops continuity links to shots that became stills", () => {
    const linked = shots.map((s, i) => (i === 5 ? { ...s, continuity: { matchSetupOf: null, continueFrom: 4 } } : s));
    const res = allocateHeroShots(linked, STRATEGY_DEFAULTS.hybrid, purposes);
    expect(res.shots[5]!.continuity.continueFrom).toBeNull();
  });

  it("makes everything hero in full_motion", () => {
    const res = allocateHeroShots(shots, STRATEGY_DEFAULTS.full_motion, purposes);
    expect(res.shots.every((s) => s.kind === "hero")).toBe(true);
  });
});

describe("validateShotList", () => {
  it("reports unknown references and forward continuity", () => {
    const list = ShotList.parse({
      shots: [shot(0), shot(1, { beatId: "b9", location: "Nowhere", continuity: { matchSetupOf: 1, continueFrom: null } })],
    });
    const issues = validateShotList(list, { beatIds: ["b1", "b2"], characterNames: ["moses"], locationNames: ["rephidim"] });
    const text = issues.map((i) => i.message).join("\n");
    expect(text).toMatch(/unknown beat b9/);
    expect(text).toMatch(/unknown location/);
    expect(text).toMatch(/earlier shot/);
    expect(text).toMatch(/beat b2 has no shot/);
  });
});

describe("estimateVideoCost", () => {
  it("lands near the documented ~$1.7 for a 45 s hybrid reel on H3 Max 768p", () => {
    const shots = Array.from({ length: 12 }, (_, i) => ({ kind: i < 2 ? ("hero" as const) : ("still" as const), durationSec: i < 2 ? 5 : 3.5 }));
    const est = estimateVideoCost({
      shots,
      providers: { ...DEFAULT_PROVIDERS, llm: { provider: "anthropic", model: "claude-sonnet-5-5", options: {} } },
      narrationSeconds: 45,
      narrationCharacters: 600,
      newCharacters: 0,
    });
    expect(est.video).toBeCloseTo(10 * 0.08 * 1.5);
    expect(est.total).toBeGreaterThan(1.2);
    expect(est.total).toBeLessThan(2.5);
  });
  it("is zero with mock providers", () => {
    const est = estimateVideoCost({ shots: [{ kind: "hero", durationSec: 5 }], providers: MOCK_PROVIDERS, narrationSeconds: 30, narrationCharacters: 300, newCharacters: 2 });
    expect(est.total).toBe(0);
  });
});

describe("checkBudget", () => {
  it("blocks when the estimate exceeds what is left", () => {
    expect(checkBudget({ monthlyBudgetUsd: 100, spentThisMonthUsd: 99, estimateUsd: 2 }).ok).toBe(false);
    expect(checkBudget({ monthlyBudgetUsd: 100, spentThisMonthUsd: 10, estimateUsd: 2 }).ok).toBe(true);
  });
});

describe("prompts and references", () => {
  const s = shot(0, {
    characters: [
      { name: "Jesus", action: "reaching out a hand", expression: "compassionate", position: "left", facing: "right" },
      { name: "Peter", action: "sinking in the waves", expression: "afraid", position: "right", facing: "left" },
    ],
    location: "Sea of Galilee",
  });

  it("orders references: primary views, setup, location, secondary views, style", () => {
    const refs = selectKeyframeReferences({
      shot: s,
      characterViews: {
        Jesus: [
          { view: "front", assetId: "j-front" },
          { view: "three_quarter_right", assetId: "j-34r" },
        ],
        peter: [
          { view: "three_quarter_left", assetId: "p-34l" },
          { view: "profile_left", assetId: "p-prof" },
        ],
      },
      locationRefAssetId: "loc",
      matchSetupKeyframeAssetId: "setup",
      styleRefAssetIds: ["style"],
      max: 5,
    });
    expect(refs.map((r) => r.assetId)).toEqual(["j-34r", "p-34l", "setup", "loc", "j-front"]);
  });

  it("builds keyframe and motion prompts with style and camera language", () => {
    const { prompt } = buildKeyframePrompt({
      style: BIBLE_NICHE_SETTINGS.style,
      shot: s,
      characters: [{ name: "Jesus", appearance: "brown hair", wardrobe: "white robe" }],
      location: { name: "Sea of Galilee", description: "stormy lake at night", era: "1st century" },
      referenceLabels: ["Character: Jesus"],
    });
    expect(prompt).toMatch(/^Cinematic film still/);
    expect(prompt).toMatch(/medium shot/);
    expect(prompt).toMatch(/Jesus \(brown hair; wearing white robe\)/);
    expect(prompt).toMatch(/9:16/);
    expect(buildMotionPrompt(s)).toMatch(/locked-off static camera/);
  });

  it("maps every camera move to a Ken Burns plan", () => {
    expect(kenBurnsFor("push_in").toScale).toBeGreaterThan(kenBurnsFor("push_in").fromScale);
    expect(kenBurnsFor("pan_left").toX).toBeGreaterThan(kenBurnsFor("pan_left").fromX);
  });
});

describe("timing", () => {
  it("cuts shots on word boundaries of the real narration", () => {
    const text = "In the beginning God created the heavens and the earth and it was good";
    const words = estimateWordTimings(text, 6, 0);
    const timings = fitShotsToNarration(
      [{ narration: "In the beginning God created" }, { narration: "the heavens and the earth" }, { narration: "and it was good" }],
      words,
      6,
      0.5,
    );
    expect(timings).toHaveLength(3);
    expect(timings[0]!.startSec).toBe(0);
    expect(timings[2]!.endSec).toBe(6);
    expect(timings[1]!.startSec).toBeCloseTo(words[5]!.startSec);
    const sum = timings.reduce((a, t) => a + t.durationSec, 0);
    expect(sum).toBeCloseTo(6);
  });

  it("enforces a minimum shot length by borrowing from neighbours", () => {
    const timings = fitShotsToNarration([{ narration: "a" }, { narration: "b c d e f g h i j k l m n o p" }], [], 10, 2);
    expect(timings[0]!.durationSec).toBeGreaterThanOrEqual(2 - 1e-9);
    expect(timings[0]!.durationSec + timings[1]!.durationSec).toBeCloseTo(10);
  });

  it("snaps clip durations to allowed values", () => {
    const caps = { minDurationSec: 5, maxDurationSec: 10, allowedDurationsSec: [5, 10], supportsLastFrame: false, maxReferenceImages: 0, resolutions: ["720p" as const], nativeAudio: false };
    expect(snapDuration(6.9, caps)).toBe(5);
    expect(snapDuration(8, caps)).toBe(10);
    expect(snapDuration(20, { ...caps, allowedDurationsSec: null })).toBe(10);
  });
});

describe("status machine", () => {
  it("allows review loops but not skipping review into publish", () => {
    expect(canTransition("final_review", "generating")).toBe(true);
    expect(canTransition("script_review", "published")).toBe(false);
  });
});

describe("schedule", () => {
  it("converts New York wall time to UTC across DST", async () => {
    const { zonedTimeToUtc } = await import("./schedule");
    expect(zonedTimeToUtc(2026, 7, 1, 7, 30, "America/New_York").toISOString()).toBe("2026-07-01T11:30:00.000Z");
    expect(zonedTimeToUtc(2026, 12, 1, 7, 30, "America/New_York").toISOString()).toBe("2026-12-01T12:30:00.000Z");
  });

  it("finds the next free slot after the lead time, skipping taken ones", async () => {
    const { nextFreeSlot } = await import("./schedule");
    const slots = [
      { time: "07:30", days: [], platforms: ["youtube" as const] },
      { time: "19:30", days: [], platforms: ["youtube" as const] },
    ];
    const from = new Date("2026-10-09T10:00:00Z"); // 06:00 in New York
    const first = nextFreeSlot(slots, "America/New_York", from, new Set());
    expect(first?.at.toISOString()).toBe("2026-10-09T11:30:00.000Z");
    const second = nextFreeSlot(slots, "America/New_York", from, new Set([first!.at.toISOString()]));
    expect(second?.at.toISOString()).toBe("2026-10-09T23:30:00.000Z");
  });

  it("respects weekday filters", async () => {
    const { upcomingSlots } = await import("./schedule");
    const occ = upcomingSlots([{ time: "12:00", days: [0], platforms: ["tiktok"] }], "America/New_York", new Date("2026-10-09T00:00:00Z"), 7);
    expect(occ).toHaveLength(1);
    expect(occ[0]!.at.toISOString()).toBe("2026-10-11T16:00:00.000Z");
  });
});

describe("contracts", () => {
  it("round-trips the LLM context block", async () => {
    const { contextBlock, parseContextBlock } = await import("./contracts");
    const prompt = `Write a script.\n\n${contextBlock({ targetWords: 110, title: "David" })}`;
    expect(parseContextBlock<{ targetWords: number }>(prompt)?.targetWords).toBe(110);
    expect(parseContextBlock("no block here")).toBeNull();
  });
});

describe("seo", () => {
  const good = {
    youtube: {
      title: "Moses Strikes the Rock | Water in the Desert",
      description: "Moses strikes the rock at Rephidim and water pours out for a thirsty people (Exodus 17:1-7).\n\nContext...\n\n#BibleStory #Moses #Exodus",
      tags: ["moses", "bible story", "exodus 17"],
    },
    facebook: { caption: "Moses strikes the rock and water flows in the desert. What do you do when you are thirsty for hope?", hashtags: ["#BibleStory", "#Moses", "#Exodus"] },
    instagram: { caption: "Moses strikes the rock: God provides water in the desert.", hashtags: ["BibleStory", "Moses", "Faith"] },
    tiktok: { caption: "Moses strikes the rock and water flows. Exodus 17.", hashtags: ["#BibleStory", "#Moses", "#Faith"] },
  };

  it("passes well-formed metadata", async () => {
    const { lintPlatformMeta, hasBlockingSeoIssues } = await import("./seo");
    const issues = lintPlatformMeta(good, { primaryKeyword: "Moses strikes the rock", scriptureRef: "Exodus 17:1-7" });
    expect(issues).toEqual([]);
    expect(hasBlockingSeoIssues(issues)).toBe(false);
  });

  it("flags engagement bait, late keywords and hashtag spam", async () => {
    const { lintPlatformMeta, hasBlockingSeoIssues } = await import("./seo");
    const bad = {
      ...good,
      youtube: { ...good.youtube, title: "You won't believe what happened next in the desert with MOSES striking a rock" },
      facebook: { caption: "Type AMEN if you believe! Share this to be blessed", hashtags: ["#a", "#b", "#c", "#d", "#e", "#f"] },
    };
    const issues = lintPlatformMeta(bad, { primaryKeyword: "Moses strikes the rock", scriptureRef: "Exodus 17:1-7" });
    const text = issues.map((i) => `${i.platform}.${i.field}: ${i.message}`).join("\n");
    expect(text).toMatch(/youtube.title: put "Moses strikes the rock"/);
    expect(text).toMatch(/clickbait/);
    expect(text).toMatch(/facebook.caption: engagement bait: "Type AMEN/);
    expect(text).toMatch(/facebook.caption: engagement bait: "Share this/);
    expect(text).toMatch(/6 hashtags/);
    expect(hasBlockingSeoIssues(issues)).toBe(true);
  });

  it("builds a YouTube description with citation, disclosure and at most 3 hashtags", async () => {
    const { buildYoutubeDescription } = await import("./seo");
    const d = buildYoutubeDescription({
      summary: "Moses strikes the rock and water flows.",
      context: "Israel camps at Rephidim.",
      scripture: { ref: "Exodus 17:1-7", translation: "BSB" },
      seriesName: "Bible Stories",
      callToAction: null,
      hashtags: ["BibleStory", "#Moses", "#moses", "#Exodus", "#Faith"],
    });
    expect(d).toMatch(/Scripture: Exodus 17:1-7 \(BSB\)/);
    expect(d).toMatch(/made with AI tools/);
    expect(d.match(/#\w+/g)).toEqual(["#BibleStory", "#Moses", "#Exodus"]);
  });

  it("ships SEO rules with the Bible niche preset", () => {
    expect(BIBLE_NICHE_SETTINGS.contentRules.some((r) => r.includes("engagement bait"))).toBe(true);
  });
});
