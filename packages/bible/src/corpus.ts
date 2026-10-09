import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { findBook, hebrewToVulgatePsalm } from "./books";
import { formatReference, parseReference } from "./reference";

export interface TranslationInfo {
  code: string;
  name: string;
  canon: "protestant" | "catholic";
  license: string;
  /** Catholic editions number the Psalms like the Vulgate. */
  psalmNumbering: "hebrew" | "vulgate";
}

export const TRANSLATIONS: TranslationInfo[] = [
  { code: "BSB", name: "Berean Standard Bible", canon: "protestant", license: "Public domain (2023)", psalmNumbering: "hebrew" },
  { code: "KJV", name: "King James Version (1769)", canon: "protestant", license: "Public domain (outside the UK)", psalmNumbering: "hebrew" },
  { code: "DRC", name: "Douay-Rheims, Challoner revision", canon: "catholic", license: "Public domain", psalmNumbering: "vulgate" },
  { code: "CPDV", name: "Catholic Public Domain Version", canon: "catholic", license: "Public domain", psalmNumbering: "vulgate" },
];

/** Normalized corpus written by scripts/fetch.ts: books[id][chapter-1][verse-1]. */
export interface Corpus {
  code: string;
  name: string;
  books: Record<string, string[][]>;
}

export interface Passage {
  reference: string;
  text: string;
  verses: { book: string; chapter: number; verse: number; text: string }[];
}

export function dataDir(): string {
  return process.env.BIBLE_DATA_DIR ?? fileURLToPath(new URL("../data/", import.meta.url));
}

export function corpusPath(code: string, dir = dataDir()): string {
  return join(dir, `${code.toUpperCase()}.json`);
}

export function listTranslations(): (TranslationInfo & { available: boolean })[] {
  return TRANSLATIONS.map((t) => ({ ...t, available: existsSync(corpusPath(t.code)) }));
}

const cache = new Map<string, Promise<Corpus | null>>();

export function loadCorpus(code: string, dir = dataDir()): Promise<Corpus | null> {
  const path = corpusPath(code, dir);
  let pending = cache.get(path);
  if (!pending) {
    pending = readFile(path, "utf8")
      .then((raw) => JSON.parse(raw) as Corpus)
      .catch(() => {
        // Don't remember a miss: the corpus may be downloaded later in the same process.
        cache.delete(path);
        return null;
      });
    cache.set(path, pending);
  }
  return pending;
}

/** Test hook: forget loaded corpora (e.g. after BIBLE_DATA_DIR changes). */
export function clearCorpusCache(): void {
  cache.clear();
}

export async function getPassage(translation: string, reference: string): Promise<Passage | null> {
  const info = TRANSLATIONS.find((t) => t.code === translation.toUpperCase());
  const ref = parseReference(reference);
  if (!info || !ref) return null;
  const book = findBook(ref.book);
  const corpus = await loadCorpus(info.code);
  if (!book || !corpus) return null;

  let chapterNo = ref.chapter;
  let verseOffset = 0;
  if (book.id === "PSA" && info.psalmNumbering === "vulgate") {
    chapterNo = hebrewToVulgatePsalm(ref.chapter, ref.verseStart);
    // Second halves of Hebrew 116 and 147 restart at verse 1 in the Vulgate.
    if (ref.chapter === 116 && chapterNo === 115) verseOffset = -9;
    if (ref.chapter === 147 && chapterNo === 147) verseOffset = -11;
  }
  const chapter = corpus.books[book.id]?.[chapterNo - 1];
  if (!chapter) return null;

  const first = ref.verseStart === null ? 1 : ref.verseStart + verseOffset;
  const last = ref.verseStart === null || ref.verseEnd === null ? chapter.length : ref.verseEnd + verseOffset;
  const verses: Passage["verses"] = [];
  for (let v = Math.max(1, first); v <= Math.min(last, chapter.length); v++) {
    const text = chapter[v - 1]?.trim();
    if (text) verses.push({ book: book.name, chapter: chapterNo, verse: v, text });
  }
  if (verses.length === 0) return null;
  return { reference: formatReference(ref), text: verses.map((v) => v.text).join(" ").replace(/\s+/g, " "), verses };
}
