import { ProviderError, type TtsProvider, type TtsRequest, type TtsResult, type TtsVoice, type WordTiming } from "@media-studio/core";
import { requestJson } from "./http";
import { base64ToBytes, pcmToWav } from "./media";
import { ttsUsage } from "./pricing";

const PROVIDER = "elevenlabs";
const BASE_URL = "https://api.elevenlabs.io";
const SAMPLE_RATE = 24_000;
const BLOCKED = /content_against_policy|policy|moderation|blocked/i;

interface Alignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

interface WithTimestampsResponse {
  audio_base64: string;
  alignment?: Alignment | null;
  normalized_alignment?: Alignment | null;
}

export interface ElevenLabsOptions {
  apiKey: string;
  fetch?: typeof fetch;
  baseUrl?: string;
}

/** Group character-level timings into whitespace-delimited words. */
export function wordsFromCharacterAlignment(alignment: Alignment): WordTiming[] {
  const words: WordTiming[] = [];
  let current: WordTiming | null = null;
  for (let i = 0; i < alignment.characters.length; i++) {
    const ch = alignment.characters[i]!;
    const start = alignment.character_start_times_seconds[i] ?? 0;
    const end = alignment.character_end_times_seconds[i] ?? start;
    if (/\s/.test(ch)) {
      if (current) words.push(current);
      current = null;
    } else if (!current) {
      current = { word: ch, startSec: start, endSec: end };
    } else {
      current.word += ch;
      current.endSec = Math.max(current.endSec, end);
    }
  }
  if (current) words.push(current);
  return words;
}

function elevenErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    const d = detail as { status?: string; message?: string };
    if (d.message) return `${d.status ? `${d.status}: ` : ""}${d.message}`;
    return JSON.stringify(detail);
  }
  return null;
}

export class ElevenLabsTtsProvider implements TtsProvider {
  readonly id = PROVIDER;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  constructor(opts: ElevenLabsOptions) {
    this.apiKey = opts.apiKey;
    this.fetchImpl = opts.fetch ?? fetch;
    this.baseUrl = (opts.baseUrl ?? BASE_URL).replace(/\/+$/, "");
  }

  async synthesize(req: TtsRequest): Promise<TtsResult> {
    const { voice, text } = req;
    // ElevenLabs accepts speed in 0.7–1.2; style text is not sent because it would be read aloud.
    const speed = Math.min(1.2, Math.max(0.7, voice.speakingRate));
    const url = `${this.baseUrl}/v1/text-to-speech/${encodeURIComponent(voice.voiceId)}/with-timestamps?output_format=pcm_${SAMPLE_RATE}`;
    const { headers, body } = await requestJson<WithTimestampsResponse>(
      url,
      {
        method: "POST",
        headers: { "xi-api-key": this.apiKey, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ text, model_id: voice.model, voice_settings: { speed } }),
      },
      {
        provider: PROVIDER,
        operation: "tts",
        fetch: this.fetchImpl,
        timeoutMs: 5 * 60_000,
        blockedPattern: BLOCKED,
        errorMessage: elevenErrorMessage,
      },
    );
    if (!body.audio_base64) throw new ProviderError("elevenlabs returned no audio", { kind: "retryable", provider: PROVIDER });
    const pcm = base64ToBytes(body.audio_base64);
    const durationSec = pcm.byteLength / (SAMPLE_RATE * 2);
    const alignment = body.alignment ?? body.normalized_alignment ?? null;
    const words = alignment ? wordsFromCharacterAlignment(alignment) : null;
    const billedChars = Number(headers.get("character-cost") ?? headers.get("x-character-count"));
    const characters = Number.isFinite(billedChars) && billedChars > 0 ? billedChars : text.length;
    return {
      audio: { data: pcmToWav(pcm, SAMPLE_RATE, 1, 16), mimeType: "audio/wav" },
      durationSec,
      words: words && words.length > 0 ? words : null,
      usage: [ttsUsage(PROVIDER, voice.model, durationSec, characters, "character")],
    };
  }

  async listVoices(_model: string): Promise<TtsVoice[]> {
    const { body } = await requestJson<{ voices?: { voice_id: string; name?: string; description?: string | null; labels?: Record<string, string> }[] }>(
      `${this.baseUrl}/v1/voices`,
      { method: "GET", headers: { "xi-api-key": this.apiKey } },
      { provider: PROVIDER, operation: "list voices", fetch: this.fetchImpl, errorMessage: elevenErrorMessage },
    );
    return (body.voices ?? []).map((v) => ({
      id: v.voice_id,
      name: v.name ?? v.voice_id,
      description: v.description ?? Object.values(v.labels ?? {}).join(", "),
    }));
  }
}
