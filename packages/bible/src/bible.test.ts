import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  STORY_INDEX,
  clearCorpusCache,
  findBook,
  getPassage,
  hebrewToVulgatePsalm,
  listTranslations,
  parseReference,
  suggestPassages,
} from "./index";

describe("parseReference", () => {
  const cases: [string, ReturnType<typeof parseReference>][] = [
    ["Exodus 17:1-7", { book: "Exodus", chapter: 17, verseStart: 1, verseEnd: 7 }],
    ["Ex 17:1–7", { book: "Exodus", chapter: 17, verseStart: 1, verseEnd: 7 }],
    ["1 Samuel 17", { book: "1 Samuel", chapter: 17, verseStart: null, verseEnd: null }],
    ["1 Sam 17:45", { book: "1 Samuel", chapter: 17, verseStart: 45, verseEnd: 45 }],
    ["I Samuel 17:4-11, 45-50", { book: "1 Samuel", chapter: 17, verseStart: 4, verseEnd: 11 }],
    ["Psalm 23", { book: "Psalms", chapter: 23, verseStart: null, verseEnd: null }],
    ["Ps. 23:1-4", { book: "Psalms", chapter: 23, verseStart: 1, verseEnd: 4 }],
    ["John 3:16", { book: "John", chapter: 3, verseStart: 16, verseEnd: 16 }],
    ["John 3:16-4:2", { book: "John", chapter: 3, verseStart: 16, verseEnd: null }],
    ["Song of Songs 2:1", { book: "Song of Songs", chapter: 2, verseStart: 1, verseEnd: 1 }],
    ["Sirach 3:1-6", { book: "Sirach", chapter: 3, verseStart: 1, verseEnd: 6 }],
    ["Tobit 12:6", { book: "Tobit", chapter: 12, verseStart: 6, verseEnd: 6 }],
    ["2 Maccabees 7:1", { book: "2 Maccabees", chapter: 7, verseStart: 1, verseEnd: 1 }],
    ["second kings 2:11", { book: "2 Kings", chapter: 2, verseStart: 11, verseEnd: 11 }],
    ["1Cor 13:4", { book: "1 Corinthians", chapter: 13, verseStart: 4, verseEnd: 4 }],
  ];
  it.each(cases)("parses %s", (input, expected) => {
    expect(parseReference(input)).toEqual(expected);
  });
  it("rejects unknown books and bad ranges", () => {
    expect(parseReference("Hezekiah 3:1")).toBeNull();
    expect(parseReference("John 3:16-2")).toBeNull();
    expect(parseReference("just words")).toBeNull();
  });
  it("finds books by Vulgate names", () => {
    expect(findBook("3 Kings")?.id).toBe("1KI");
    expect(findBook("Ecclesiasticus")?.id).toBe("SIR");
    expect(findBook("Apocalypse")?.id).toBe("REV");
  });
});

describe("Hebrew to Vulgate psalms", () => {
  it("maps merged and split psalms", () => {
    expect(hebrewToVulgatePsalm(8)).toBe(8);
    expect(hebrewToVulgatePsalm(10)).toBe(9);
    expect(hebrewToVulgatePsalm(23)).toBe(22);
    expect(hebrewToVulgatePsalm(115)).toBe(113);
    expect(hebrewToVulgatePsalm(116, 1)).toBe(114);
    expect(hebrewToVulgatePsalm(116, 12)).toBe(115);
    expect(hebrewToVulgatePsalm(147, 12)).toBe(147);
    expect(hebrewToVulgatePsalm(150)).toBe(150);
  });
});

describe("suggestPassages", () => {
  it("has at least 150 curated stories with parseable references", () => {
    expect(STORY_INDEX.length).toBeGreaterThanOrEqual(150);
    for (const s of STORY_INDEX) for (const r of s.refs) expect(parseReference(r), `${s.title}: ${r}`).not.toBeNull();
  });
  it("finds well-known stories", () => {
    expect(suggestPassages("david and goliath")[0]).toBe("1 Samuel 17:1-54");
    expect(suggestPassages("The prodigal son")[0]).toBe("Luke 15:11-32");
    expect(suggestPassages("Moses strikes the rock")).toEqual(expect.arrayContaining(["Exodus 17:1-7", "Numbers 20:1-13"]));
    expect(suggestPassages("Annunciation")[0]).toBe("Luke 1:26-38");
    expect(suggestPassages("wedding at cana")[0]).toBe("John 2:1-11");
    expect(suggestPassages("xyzzy")).toEqual([]);
  });
});

describe("getPassage (committed fixtures)", () => {
  const previous = process.env.BIBLE_DATA_DIR;
  beforeAll(() => {
    process.env.BIBLE_DATA_DIR = fileURLToPath(new URL("../data/fixtures/", import.meta.url));
    clearCorpusCache();
  });
  afterAll(() => {
    if (previous === undefined) delete process.env.BIBLE_DATA_DIR;
    else process.env.BIBLE_DATA_DIR = previous;
    clearCorpusCache();
  });

  it("returns verses and joined text", async () => {
    const p = await getPassage("BSB", "Exodus 17:5-6");
    expect(p?.reference).toBe("Exodus 17:5-6");
    expect(p?.verses.map((v) => v.verse)).toEqual([5, 6]);
    expect(p?.text).toMatch(/strike the rock/i);
  });

  it("returns a whole chapter when no verses are given", async () => {
    const p = await getPassage("BSB", "Psalm 23");
    expect(p?.verses).toHaveLength(6);
  });

  it("maps modern psalm numbers onto Douay-Rheims", async () => {
    const p = await getPassage("DRC", "Psalm 23:1");
    expect(p?.text).toMatch(/Lord ruleth me/);
    const second = await getPassage("DRC", "Psalm 116:10");
    expect(second?.verses[0]).toMatchObject({ chapter: 115, verse: 1 });
  });

  it("reads deuterocanonical books from Catholic editions", async () => {
    expect((await getPassage("DRC", "Tobit 12:15"))?.text).toMatch(/Raphael/);
  });

  it("returns null for unknown refs, books or translations", async () => {
    expect(await getPassage("BSB", "Tobit 12:6")).toBeNull();
    expect(await getPassage("NIV", "John 3:16")).toBeNull();
    expect(await getPassage("BSB", "John 99:1")).toBeNull();
  });
});

const realData = fileURLToPath(new URL("../data/", import.meta.url));
describe.skipIf(!existsSync(`${realData}DRC.json`))("getPassage (downloaded corpora)", () => {
  it("reads real text from every downloaded translation", async () => {
    clearCorpusCache();
    expect(listTranslations().filter((t) => t.available).length).toBeGreaterThan(0);
    expect((await getPassage("KJV", "John 3:16"))?.text).toMatch(/God so loved the world/);
    expect((await getPassage("BSB", "1 Samuel 17:49"))?.text).toMatch(/stone/);
    expect((await getPassage("CPDV", "Luke 1:28"))?.text).toMatch(/Hail/);
    expect((await getPassage("DRC", "2 Maccabees 7:1"))?.text).toMatch(/seven brethren|brothers/i);
  });
});
