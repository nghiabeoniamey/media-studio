import { findBook } from "./books";

export interface ParsedReference {
  /** Canonical English book name, e.g. "1 Samuel". */
  book: string;
  chapter: number;
  verseStart: number | null;
  verseEnd: number | null;
}

const REF = /^\s*(.+?)\s*(\d+)(?:\s*:\s*(\d+)(?:\s*[-–—]\s*(?:(\d+)\s*:\s*)?(\d+))?)?\s*(?:[,;].*)?$/;

/**
 * Parse "Exodus 17:1-7", "Ex 17:1–7", "1 Sam 17", "Psalm 23", "I Samuel 17:45", "Sirach 3:1-6".
 * Only the first range is kept ("1 Samuel 17:4-11, 45-50" -> 17:4-11). A range that runs into the
 * next chapter ("John 3:16-4:2") is clipped to the end of the first chapter (verseEnd null).
 */
export function parseReference(input: string): ParsedReference | null {
  const m = REF.exec(input.replace(/ /g, " "));
  if (!m) return null;
  const [, bookRaw, chapterRaw, startRaw, endChapterRaw, endRaw] = m;
  const book = findBook(bookRaw!);
  if (!book) return null;
  const chapter = Number(chapterRaw);
  if (!Number.isInteger(chapter) || chapter < 1) return null;
  const verseStart = startRaw ? Number(startRaw) : null;
  let verseEnd: number | null = verseStart;
  if (endRaw) {
    const crossesChapter = endChapterRaw !== undefined && Number(endChapterRaw) !== chapter;
    verseEnd = crossesChapter ? null : Number(endRaw);
  }
  if (verseStart !== null && verseEnd !== null && verseEnd < verseStart) return null;
  return { book: book.name, chapter, verseStart, verseEnd };
}

export function formatReference(ref: ParsedReference): string {
  if (ref.verseStart === null) return `${ref.book} ${ref.chapter}`;
  if (ref.verseEnd === null) return `${ref.book} ${ref.chapter}:${ref.verseStart}-end`;
  if (ref.verseEnd === ref.verseStart) return `${ref.book} ${ref.chapter}:${ref.verseStart}`;
  return `${ref.book} ${ref.chapter}:${ref.verseStart}-${ref.verseEnd}`;
}
