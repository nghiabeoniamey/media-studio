import { createTikTokStyleCaptions, type Caption } from "@remotion/captions";
import type { CaptionPreset } from "@media-studio/core";

export interface CaptionWord {
  word: string;
  startSec: number;
  endSec: number;
}

export interface CaptionToken {
  text: string;
  startSec: number;
  endSec: number;
}

export interface CaptionPage {
  startSec: number;
  /** When the page leaves the screen (next page start, or a short linger after the last word). */
  endSec: number;
  tokens: CaptionToken[];
  text: string;
}

export interface PagingRules {
  maxWords: number;
  maxChars: number;
  /** Close the page after sentence punctuation. */
  breakOnSentence: boolean;
  /** Close the page after a comma/semicolon once it already holds this many words. */
  clauseBreakMinWords: number;
  /** Close the page when the next word starts after a pause this long. */
  silenceBreakSec: number;
  /** Close the page once it spans this long. */
  maxPageSec: number;
  /** How long a page stays after its last word when nothing follows immediately. */
  lingerSec: number;
}

/** Per-style paging: word_pop shows 1–3 words, karaoke a page of up to maxWordsPerPage, cinematic sentence-ish lines. */
export function pagingRules(preset: Pick<CaptionPreset, "style" | "maxWordsPerPage">, charsPerLine: number): PagingRules {
  const max = Math.max(1, preset.maxWordsPerPage);
  switch (preset.style) {
    case "word_pop":
      return {
        maxWords: Math.min(max, 3),
        maxChars: charsPerLine,
        breakOnSentence: true,
        clauseBreakMinWords: 1,
        silenceBreakSec: 0.35,
        maxPageSec: 1.2,
        lingerSec: 0.25,
      };
    case "karaoke_highlight":
      return {
        maxWords: max,
        maxChars: charsPerLine * 2,
        breakOnSentence: true,
        clauseBreakMinWords: Math.max(2, Math.ceil(max / 2)),
        silenceBreakSec: 0.6,
        maxPageSec: 2.6,
        lingerSec: 0.45,
      };
    case "cinematic_subtitle":
      return {
        maxWords: Math.max(max * 3, 10),
        maxChars: Math.round(charsPerLine * 1.9),
        breakOnSentence: true,
        clauseBreakMinWords: 5,
        silenceBreakSec: 0.8,
        maxPageSec: 4.5,
        lingerSec: 0.7,
      };
    case "minimal":
      return {
        maxWords: max,
        maxChars: charsPerLine * 2,
        breakOnSentence: true,
        clauseBreakMinWords: Math.max(2, Math.ceil(max / 2)),
        silenceBreakSec: 0.6,
        maxPageSec: 2.6,
        lingerSec: 0.45,
      };
  }
}

const SENTENCE_END = /[.!?…]["'”’)\]]*$/;
const CLAUSE_END = /[,;:—–]["'”’)\]]*$/;

/** Decide where pages end; returns the indexes of words that close a page. */
export function pageBreaks(words: CaptionWord[], rules: PagingRules): Set<number> {
  const breaks = new Set<number>();
  let count = 0;
  let chars = 0;
  let pageStart = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    const next = words[i + 1];
    if (count === 0) pageStart = w.startSec;
    count += 1;
    chars += (count > 1 ? 1 : 0) + w.word.length;
    if (!next) break;
    const nextChars = chars + 1 + next.word.length;
    const close =
      count >= rules.maxWords ||
      nextChars > rules.maxChars ||
      (rules.breakOnSentence && SENTENCE_END.test(w.word)) ||
      (count >= rules.clauseBreakMinWords && CLAUSE_END.test(w.word)) ||
      next.startSec - w.endSec >= rules.silenceBreakSec ||
      next.endSec - pageStart > rules.maxPageSec;
    if (close) {
      breaks.add(i);
      count = 0;
      chars = 0;
    }
  }
  return breaks;
}

/**
 * Page script words for on-screen captions. Paging decisions are ours (word/char budget,
 * punctuation, pauses); `createTikTokStyleCaptions` turns them into token pages.
 */
export function buildCaptionPages(
  words: CaptionWord[],
  preset: Pick<CaptionPreset, "style" | "maxWordsPerPage">,
  opts: { charsPerLine: number; totalSec: number },
): CaptionPage[] {
  const clean = words
    .map((w) => ({ word: w.word.trim(), startSec: Math.max(0, w.startSec), endSec: Math.max(w.startSec, w.endSec) }))
    .filter((w) => w.word.length > 0 && w.startSec < opts.totalSec)
    .sort((a, b) => a.startSec - b.startSec);
  if (clean.length === 0) return [];
  const rules = pagingRules(preset, opts.charsPerLine);
  const breaks = pageBreaks(clean, rules);
  const captions: Caption[] = clean.map((w, i) => ({
    text: i === 0 ? w.word : ` ${w.word}`,
    startMs: Math.round(w.startSec * 1000),
    endMs: Math.round(w.endSec * 1000),
    timestampMs: null,
    confidence: null,
    pageBreakAfter: breaks.has(i),
  }));
  const { pages } = createTikTokStyleCaptions({
    captions,
    // Paging is fully decided by pageBreakAfter above.
    combineTokensWithinMilliseconds: Number.MAX_SAFE_INTEGER,
  });
  const out: CaptionPage[] = pages
    .filter((p) => p.tokens.length > 0)
    .map((p) => {
      const tokens = p.tokens.map((t) => ({ text: t.text.trim(), startSec: t.fromMs / 1000, endSec: t.toMs / 1000 }));
      return { startSec: p.startMs / 1000, endSec: 0, tokens, text: tokens.map((t) => t.text).join(" ") };
    });
  for (let i = 0; i < out.length; i++) {
    const page = out[i]!;
    const lastEnd = page.tokens[page.tokens.length - 1]!.endSec;
    const nextStart = out[i + 1]?.startSec ?? Number.POSITIVE_INFINITY;
    page.endSec = Math.min(nextStart, lastEnd + rules.lingerSec, opts.totalSec);
    if (page.endSec <= page.startSec) page.endSec = Math.min(nextStart, page.startSec + 0.1);
  }
  return out;
}

export function activePageIndex(pages: CaptionPage[], t: number): number {
  let lo = 0;
  let hi = pages.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (pages[mid]!.startSec <= t) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (found === -1) return -1;
  return t < pages[found]!.endSec ? found : -1;
}

/** Index of the token being spoken at `t` (the last token that has started), or -1 before the first. */
export function activeTokenIndex(page: CaptionPage, t: number): number {
  let idx = -1;
  for (let i = 0; i < page.tokens.length; i++) if (page.tokens[i]!.startSec <= t) idx = i;
  return idx;
}
