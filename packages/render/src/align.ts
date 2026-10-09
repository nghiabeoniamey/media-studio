import { estimateWordTimings, type WordTiming } from "@media-studio/core";
import type { Caption } from "@remotion/captions";
import { toCaptions, transcribe, type WhisperModel } from "@remotion/install-whisper-cpp";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { detectSilences, probeMedia, toWav16k, type Silence } from "./ffmpeg";

export interface AlignOptions {
  /** whisper.cpp install dir. Defaults to env WHISPER_CPP_DIR; null disables whisper. */
  whisperDir?: string | null;
  /** whisper model name (default env WHISPER_MODEL or "base.en"). */
  model?: string;
}

export interface AlignResult {
  words: WordTiming[];
  method: "whisper" | "estimate";
}

// ---------------------------------------------------------------------------
// Whisper tokens → ASR words → script words
// ---------------------------------------------------------------------------

export interface AsrWord {
  text: string;
  startSec: number;
  endSec: number;
}

const SPECIAL_TOKEN = /^\s*\[[^\]]*\]\s*$/;

/**
 * Whisper emits sub-word tokens; a token starting with a space opens a new word, others
 * (word pieces, punctuation) continue the current one. The DTW timestamp is the most
 * precise start when present.
 */
export function mergeTokensToWords(tokens: Caption[]): AsrWord[] {
  const words: AsrWord[] = [];
  let current: AsrWord | null = null;
  for (const tok of tokens) {
    if (!tok.text || SPECIAL_TOKEN.test(tok.text)) continue;
    const start = (tok.timestampMs ?? tok.startMs) / 1000;
    const end = Math.max(start, tok.endMs / 1000);
    const startsWord = current === null || /^\s/.test(tok.text);
    if (startsWord) {
      if (current) words.push(current);
      current = { text: tok.text.trim(), startSec: start, endSec: end };
    } else if (current) {
      current.text += tok.text;
      current.endSec = Math.max(current.endSec, end);
    }
  }
  if (current) words.push(current);
  const out = words.filter((w) => normalizeWord(w.text) !== "");
  // Monotonic, non-overlapping times.
  for (let i = 0; i < out.length; i++) {
    const w = out[i]!;
    if (i > 0) w.startSec = Math.max(w.startSec, out[i - 1]!.startSec);
    w.endSec = Math.max(w.endSec, w.startSec + 0.02);
  }
  for (let i = 0; i < out.length - 1; i++) {
    const w = out[i]!;
    w.endSec = Math.min(w.endSec, Math.max(w.startSec + 0.02, out[i + 1]!.startSec));
  }
  return out;
}

export function normalizeWord(w: string): string {
  return w
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length]!;
}

export function wordSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

const GAP_COST = 0.75;

/**
 * Monotonic alignment (Needleman–Wunsch) of script words onto ASR words. Captions must
 * show the script text, so every script word gets a time: matched words take their ASR
 * word's span (absorbing extra ASR words such as "twenty five" for "25"); unmatched
 * words are spread between their aligned neighbours.
 */
export function alignScriptToAsr(scriptWords: string[], asr: AsrWord[]): { words: WordTiming[]; matchRatio: number } {
  const n = scriptWords.length;
  const m = asr.length;
  if (n === 0) return { words: [], matchRatio: 1 };
  if (m === 0) return { words: [], matchRatio: 0 };
  const a = scriptWords.map(normalizeWord);
  const b = asr.map((w) => normalizeWord(w.text));

  const W = m + 1;
  const cost = new Float64Array((n + 1) * W);
  // 0 = diagonal, 1 = up (script word unmatched), 2 = left (extra ASR word)
  const move = new Uint8Array((n + 1) * W);
  for (let i = 1; i <= n; i++) {
    cost[i * W] = i * GAP_COST;
    move[i * W] = 1;
  }
  for (let j = 1; j <= m; j++) {
    cost[j] = j * GAP_COST;
    move[j] = 2;
  }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const ai = a[i - 1]!;
      const bj = b[j - 1]!;
      // Punctuation-only script tokens (e.g. "—") match anything cheaply.
      const sub = ai === "" ? 0.5 : ai === bj ? 0 : 1 - wordSimilarity(ai, bj);
      const diag = cost[(i - 1) * W + j - 1]! + sub;
      const up = cost[(i - 1) * W + j]! + GAP_COST;
      const left = cost[i * W + j - 1]! + GAP_COST;
      if (diag <= up && diag <= left) {
        cost[i * W + j] = diag;
        move[i * W + j] = 0;
      } else if (up <= left) {
        cost[i * W + j] = up;
        move[i * W + j] = 1;
      } else {
        cost[i * W + j] = left;
        move[i * W + j] = 2;
      }
    }
  }

  // Backtrack: for each script word, the ASR words it covers.
  const spans: { first: number; last: number }[] = Array.from({ length: n }, () => ({ first: -1, last: -1 }));
  const extras: number[][] = Array.from({ length: n + 1 }, () => []);
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const mv = move[i * W + j]!;
    if (i > 0 && j > 0 && mv === 0) {
      spans[i - 1] = { first: j - 1, last: j - 1 };
      i--;
      j--;
    } else if (i > 0 && (j === 0 || mv === 1)) {
      i--;
    } else {
      // ASR word j-1 has no script word; it sits after script word i-1.
      extras[i]!.push(j - 1);
      j--;
    }
  }
  // Extra ASR words right after a matched script word extend it ("25" spoken as "twenty five"),
  // unless they come after a real pause (hallucinated or unrelated speech).
  for (let k = 1; k <= n; k++) {
    const span = spans[k - 1]!;
    if (span.first < 0) continue;
    for (const e of [...extras[k]!].sort((x, y) => x - y)) {
      if (e === span.last + 1 && asr[e]!.startSec - asr[span.last]!.endSec < 0.6) span.last = e;
    }
  }

  let matched = 0;
  const timed: (WordTiming | null)[] = scriptWords.map((word, k) => {
    const span = spans[k]!;
    if (span.first < 0) return null;
    if (a[k] && wordSimilarity(a[k]!, b[span.first]!) >= 0.5) matched++;
    return { word, startSec: asr[span.first]!.startSec, endSec: asr[span.last]!.endSec };
  });

  // Spread unmatched runs between their neighbours, weighted by word length.
  let k = 0;
  while (k < n) {
    if (timed[k]) {
      k++;
      continue;
    }
    let end = k;
    while (end < n && !timed[end]) end++;
    const before = k > 0 ? timed[k - 1]!.endSec : Math.max(0, (timed[end]?.startSec ?? asr[0]!.startSec) - 0.3 * (end - k));
    const after = end < n ? timed[end]!.startSec : Math.max(before + 0.3 * (end - k), asr[m - 1]!.endSec);
    const weights = scriptWords.slice(k, end).map((w) => Math.max(2, normalizeWord(w).length));
    const total = weights.reduce((x, y) => x + y, 0);
    let t = before;
    for (let q = k; q < end; q++) {
      const d = ((after - before) * weights[q - k]!) / total;
      timed[q] = { word: scriptWords[q]!, startSec: t, endSec: t + d };
      t += d;
    }
    k = end;
  }

  const words = timed as WordTiming[];
  for (let q = 1; q < words.length; q++) {
    const w = words[q]!;
    w.startSec = Math.max(w.startSec, words[q - 1]!.startSec);
    w.endSec = Math.max(w.endSec, w.startSec);
  }
  for (let q = 0; q < words.length - 1; q++) {
    words[q]!.endSec = Math.min(words[q]!.endSec, Math.max(words[q]!.startSec, words[q + 1]!.startSec));
  }
  const scorable = a.filter((x) => x !== "").length;
  return { words, matchRatio: scorable === 0 ? 1 : matched / scorable };
}

export function scriptWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Estimation anchored on pauses (no whisper)
// ---------------------------------------------------------------------------

const BOUNDARY = /[.!?…,;:—–]["'”’)\]]*$/;
const SENTENCE = /[.!?…]["'”’)\]]*$/;

/**
 * Estimate word times inside [speechStart, speechEnd], snapping punctuation boundaries to
 * detected pauses. TTS pauses at sentence ends and most commas, so anchoring there keeps
 * captions in sync far better than a single proportional spread.
 */
export function estimateWithPauses(text: string, speechStart: number, speechEnd: number, pauses: Silence[]): WordTiming[] {
  const words = scriptWords(text);
  if (words.length === 0) return [];
  const inner = pauses
    .filter((p) => p.startSec > speechStart + 0.05 && p.endSec < speechEnd - 0.05)
    .sort((x, y) => x.startSec - y.startSec);

  const out: WordTiming[] = [];
  const place = (from: number, to: number, startSec: number, endSec: number) => {
    const slice = words.slice(from, to + 1).join(" ");
    for (const w of estimateWordTimings(slice, Math.max(0.05, endSec - startSec), 0)) {
      out.push({ word: w.word, startSec: w.startSec + startSec, endSec: w.endSec + startSec });
    }
  };

  // Walk pauses in order; each one snaps to the nearest punctuation boundary of a fresh
  // estimate of the words still unplaced, so earlier anchors correct the drift for later ones.
  let segStartWord = 0;
  let segStartSec = speechStart;
  for (const p of inner) {
    if (p.startSec <= segStartSec || segStartWord >= words.length - 1) continue;
    const remaining = words.slice(segStartWord).join(" ");
    const est = estimateWordTimings(remaining, speechEnd - segStartSec, 0);
    const mid = (p.startSec + p.endSec) / 2;
    const tolerance = Math.max(0.5, Math.min(1.5, (speechEnd - segStartSec) * 0.08));
    let best = -1;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let i = segStartWord; i < words.length - 1; i++) {
      if (!BOUNDARY.test(words[i]!)) continue;
      const dist = Math.abs(segStartSec + est[i - segStartWord]!.endSec - mid);
      const score = dist - (SENTENCE.test(words[i]!) ? 0.25 : 0);
      if (dist <= tolerance && score < bestScore) {
        best = i;
        bestScore = score;
      }
    }
    if (best < 0) continue;
    place(segStartWord, best, segStartSec, p.startSec);
    segStartWord = best + 1;
    segStartSec = p.endSec;
  }
  place(segStartWord, words.length - 1, segStartSec, speechEnd);
  return out;
}

async function estimate(audioPath: string, text: string, durationSec: number): Promise<WordTiming[]> {
  let silences: Silence[] = [];
  try {
    silences = await detectSilences(audioPath, durationSec);
  } catch {
    silences = [];
  }
  let speechStart = 0;
  let speechEnd = durationSec;
  const lead = silences.find((s) => s.startSec <= 0.05);
  if (lead && lead.endSec < durationSec) speechStart = lead.endSec;
  const tail = silences.find((s) => s.endSec >= durationSec - 0.05 && s.startSec > speechStart);
  if (tail) speechEnd = tail.startSec;
  if (speechEnd - speechStart < Math.min(0.5, durationSec * 0.5)) {
    return estimateWordTimings(text, durationSec);
  }
  return estimateWithPauses(text, speechStart, speechEnd, silences);
}

// ---------------------------------------------------------------------------
// whisper.cpp
// ---------------------------------------------------------------------------

const WHISPER_MODELS: readonly WhisperModel[] = [
  "tiny",
  "tiny.en",
  "base",
  "base.en",
  "small",
  "small.en",
  "medium",
  "medium.en",
  "large-v1",
  "large-v2",
  "large-v3",
  "large-v3-turbo",
];

export interface WhisperInstall {
  dir: string;
  /** Version string that makes @remotion/install-whisper-cpp pick the right executable layout. */
  version: string;
  model: WhisperModel;
}

/** Find a usable whisper.cpp build + model in `dir` (either the ≥1.7.4 CMake layout or the old `main`). */
export function detectWhisper(dir: string, model: string): WhisperInstall | null {
  if (!(WHISPER_MODELS as readonly string[]).includes(model)) return null;
  const abs = resolve(dir);
  if (!existsSync(join(abs, `ggml-${model}.bin`))) return null;
  if (existsSync(join(abs, "build", "bin", "whisper-cli"))) return { dir: abs, version: "1.7.6", model: model as WhisperModel };
  if (existsSync(join(abs, "main"))) return { dir: abs, version: "1.5.5", model: model as WhisperModel };
  return null;
}

// transcribe() writes its JSON to <cwd>/tmp.json, so concurrent runs in one process must not overlap.
let whisperQueue: Promise<unknown> = Promise.resolve();
function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const next = whisperQueue.then(fn, fn);
  whisperQueue = next.catch(() => undefined);
  return next;
}

async function whisperWords(audioPath: string, install: WhisperInstall): Promise<AsrWord[]> {
  const work = await mkdtemp(join(tmpdir(), "ms-whisper-"));
  try {
    const wav = join(work, "audio.wav");
    await toWav16k(audioPath, wav);
    const json = await serialized(() =>
      transcribe({
        inputPath: wav,
        whisperPath: install.dir,
        whisperCppVersion: install.version,
        model: install.model,
        modelFolder: install.dir,
        tokenLevelTimestamps: true,
        printOutput: false,
        splitOnWord: false,
      }),
    );
    return mergeTokensToWords(toCaptions({ whisperCppOutput: json }).captions);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

/** Below this share of recognisable script words the transcript is not trusted (music, wrong language). */
const MIN_MATCH_RATIO = 0.35;

/**
 * Word timings for narration audio, always spelled as the script (never the ASR text).
 * Uses whisper.cpp when installed, otherwise a pause-anchored estimate.
 */
export async function alignWords(audioPath: string, text: string, opts: AlignOptions = {}): Promise<AlignResult> {
  const { durationSec } = await probeMedia(audioPath);
  const dir = opts.whisperDir === undefined ? process.env.WHISPER_CPP_DIR || null : opts.whisperDir;
  const model = opts.model ?? (process.env.WHISPER_MODEL || "base.en");
  if (dir) {
    const install = detectWhisper(dir, model);
    if (install) {
      try {
        const asr = await whisperWords(audioPath, install);
        const { words, matchRatio } = alignScriptToAsr(scriptWords(text), asr);
        if (words.length > 0 && matchRatio >= MIN_MATCH_RATIO) {
          return { words: words.map((w) => ({ ...w, endSec: Math.min(w.endSec, durationSec) })), method: "whisper" };
        }
      } catch (err) {
        console.warn(`[render] whisper alignment failed, estimating instead: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
  return { words: await estimate(audioPath, text, durationSec), method: "estimate" };
}
