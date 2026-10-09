/** 32-bit FNV-1a: stable across runs and platforms, which is all the mocks need. */
export function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function hashHex(text: string, length = 12): string {
  let out = "";
  let seed = text;
  while (out.length < length) {
    const h = hash32(seed);
    out += h.toString(16).padStart(8, "0");
    seed = `${seed}#${h}`;
  }
  return out.slice(0, length);
}

/** Deterministic PRNG (mulberry32) seeded from a string. */
export function seededRandom(seed: string): () => number {
  let a = hash32(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(items: readonly T[], seed: string): T {
  return items[hash32(seed) % items.length]!;
}

/** HSL (h in [0,360), s/l in [0,1]) → "RRGGBB". */
export function hslHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)]
    .map((v) => Math.round(v * 255).toString(16).padStart(2, "0"))
    .join("");
}

export function titleCase(text: string): string {
  const small = new Set(["a", "an", "and", "the", "of", "in", "on", "at", "to", "for", "by", "with", "from"]);
  return text
    .trim()
    .split(/\s+/)
    .map((w, i) => (i > 0 && small.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
