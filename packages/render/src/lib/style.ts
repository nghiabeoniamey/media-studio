import type { RenderInput } from "@media-studio/core";

export const COMPOSITION_ID = "StoryVideo";

/** Props of the StoryVideo composition. Media `src` fields are http URLs served for the render. */
export type StoryVideoProps = {
  input: RenderInput;
  /** Pre-blurred, downscaled copies of stills for the depth layer, keyed by shot index. */
  depthSrc: Record<string, string>;
};

/** Font stacks rely on locally installed fonts (Inter, DejaVu); nothing is fetched at render time. */
export function sansStack(family: string | null | undefined): string {
  const clean = (family ?? "").replace(/["';{}<>]/g, "").trim();
  const head = clean && clean.toLowerCase() !== "inter" ? `"${clean}", ` : "";
  return `${head}"Inter", "DejaVu Sans", "Liberation Sans", sans-serif`;
}

export const SERIF_STACK = `"Bitstream Charter", "Charter", "Liberation Serif", "DejaVu Serif", Georgia, serif`;

/** `#RGB`, `#RRGGBB` or `#RRGGBBAA` → rgba() with the given alpha multiplied in; other CSS colors pass through. */
export function withAlpha(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(color.trim());
  if (!m) return color;
  let hex = m[1]!;
  if (hex.length === 3) hex = hex.replace(/./g, (c) => c + c);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
  const out = Math.round(a * alpha * 1000) / 1000;
  return `rgba(${r}, ${g}, ${b}, ${out})`;
}
