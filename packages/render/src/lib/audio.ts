import { clamp, smoothstep, type TimeWindow } from "./timeline";

/** Music level under narration, relative to RenderInput.music.volume (about -9 dB). */
export const DUCK_LEVEL = 0.35;
const DUCK_ATTACK_SEC = 0.15;
const DUCK_RELEASE_SEC = 0.5;
/** Pauses shorter than this keep the music ducked (avoids pumping between words). */
const SPEECH_GAP_SEC = 0.7;

/**
 * Where narration is audible: merged word timings when we have them (so music swells in
 * long pauses), otherwise the whole narration window.
 */
export function speechSegments(
  words: { startSec: number; endSec: number }[] | null,
  narration: { startSec: number; durationSec: number },
  gapSec = SPEECH_GAP_SEC,
): TimeWindow[] {
  const narrationEnd = narration.startSec + narration.durationSec;
  if (!words || words.length === 0) return [{ startSec: narration.startSec, endSec: narrationEnd }];
  const sorted = [...words].sort((a, b) => a.startSec - b.startSec);
  const out: TimeWindow[] = [];
  for (const w of sorted) {
    const last = out[out.length - 1];
    if (last && w.startSec - last.endSec < gapSec) last.endSec = Math.max(last.endSec, w.endSec);
    else out.push({ startSec: w.startSec, endSec: w.endSec });
  }
  return out;
}

/** 1 away from speech, `level` during speech, with smooth attack/release ramps. */
export function duckFactor(t: number, segments: TimeWindow[], level = DUCK_LEVEL): number {
  let factor = 1;
  for (const s of segments) {
    if (t < s.startSec - DUCK_ATTACK_SEC || t > s.endSec + DUCK_RELEASE_SEC) continue;
    let depth: number;
    if (t < s.startSec) depth = smoothstep(s.startSec - DUCK_ATTACK_SEC, s.startSec, t);
    else if (t <= s.endSec) depth = 1;
    else depth = 1 - smoothstep(s.endSec, s.endSec + DUCK_RELEASE_SEC, t);
    factor = Math.min(factor, 1 - depth * (1 - level));
  }
  return factor;
}

export interface MusicEnvelope {
  volume: number;
  totalSec: number;
  segments: TimeWindow[];
  fadeInSec: number;
  fadeOutSec: number;
}

export function musicEnvelope(volume: number, totalSec: number, segments: TimeWindow[]): MusicEnvelope {
  return {
    volume: clamp(volume, 0, 1),
    totalSec,
    segments,
    fadeInSec: Math.min(1, totalSec / 4),
    fadeOutSec: Math.min(1.8, totalSec / 4),
  };
}

/** Music gain at absolute time t: fade in/out (sine shaped) × ducking × configured volume. */
export function musicGain(t: number, env: MusicEnvelope): number {
  const fadeIn = env.fadeInSec > 0 ? Math.sin((Math.PI / 2) * clamp(t / env.fadeInSec, 0, 1)) : 1;
  const fadeOut = env.fadeOutSec > 0 ? Math.sin((Math.PI / 2) * clamp((env.totalSec - t) / env.fadeOutSec, 0, 1)) : 1;
  return env.volume * Math.min(fadeIn, fadeOut) * duckFactor(t, env.segments);
}

export interface MusicSegment {
  /** Where this copy of the track starts on the video timeline. */
  startSec: number;
  durationSec: number;
  /** Seam crossfades between consecutive copies (0 at the very start/end of the video). */
  seamInSec: number;
  seamOutSec: number;
}

/**
 * Loop a track that is shorter than the video by laying copies end to end with a short
 * equal-power crossfade at each seam (a hard loop point clicks and jumps musically).
 */
export function musicSegments(musicSec: number, totalSec: number, crossfadeSec = 1.2): MusicSegment[] {
  if (!(musicSec > 0) || !(totalSec > 0)) return [];
  if (musicSec >= totalSec) return [{ startSec: 0, durationSec: totalSec, seamInSec: 0, seamOutSec: 0 }];
  const xf = Math.min(crossfadeSec, musicSec / 4);
  const period = musicSec - xf;
  const out: MusicSegment[] = [];
  let start = 0;
  // Each new copy starts `xf` before the previous one ends, so the last copy always lasts > xf.
  for (;;) {
    const seamInSec = out.length === 0 ? 0 : xf;
    if (start + musicSec >= totalSec) {
      out.push({ startSec: start, durationSec: totalSec - start, seamInSec, seamOutSec: 0 });
      break;
    }
    out.push({ startSec: start, durationSec: musicSec, seamInSec, seamOutSec: xf });
    start += period;
  }
  return out;
}

/** Equal-power seam gain for a copy at time `local` seconds into the copy. */
export function seamGain(local: number, seg: MusicSegment): number {
  let g = 1;
  if (seg.seamInSec > 0) g *= Math.sin((Math.PI / 2) * clamp(local / seg.seamInSec, 0, 1));
  if (seg.seamOutSec > 0) g *= Math.sin((Math.PI / 2) * clamp((seg.durationSec - local) / seg.seamOutSec, 0, 1));
  return g;
}
