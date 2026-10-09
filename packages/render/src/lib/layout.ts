import type { BrandKit, CaptionPreset } from "@media-studio/core";

/**
 * 9:16 safe areas. TikTok/Reels/Shorts draw their own UI over the top ~10% (tabs, search)
 * and the bottom ~18% (caption, handle, music ticker); the right edge carries the action
 * buttons, so text keeps a side margin as well.
 */
export const SAFE_AREA = { top: 0.1, bottom: 0.18, side: 0.07 } as const;

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function safeAreaBox(width: number, height: number): Box {
  const x = Math.round(width * SAFE_AREA.side);
  const y = Math.round(height * SAFE_AREA.top);
  return { x, y, width: width - 2 * x, height: Math.round(height * (1 - SAFE_AREA.bottom)) - y };
}

export function boxBottom(b: Box): number {
  return b.y + b.height;
}

export function boxRight(b: Box): number {
  return b.x + b.width;
}

export function contains(outer: Box, inner: Box): boolean {
  return inner.x >= outer.x && inner.y >= outer.y && boxRight(inner) <= boxRight(outer) && boxBottom(inner) <= boxBottom(outer);
}

export function intersects(a: Box, b: Box): boolean {
  return a.x < boxRight(b) && b.x < boxRight(a) && a.y < boxBottom(b) && b.y < boxBottom(a);
}

export interface CaptionBox extends Box {
  /** Vertical alignment of the caption block inside its box. */
  align: "center" | "end";
}

export interface OverlayLayout {
  safe: Box;
  caption: CaptionBox;
  verse: Box;
  cta: Box;
  logo: Box;
  title: Box;
}

/**
 * Fixed regions so overlays never collide: verse card in the upper band, captions in the
 * middle/lower band, CTA lower-third just above the bottom UI zone. When a CTA exists the
 * "bottom" caption position sits above the CTA band for the whole video, so captions never jump.
 */
export function overlayLayout(args: {
  width: number;
  height: number;
  captionPosition: CaptionPreset["position"];
  watermarkPosition: BrandKit["watermarkPosition"];
  hasCta: boolean;
}): OverlayLayout {
  const { width: W, height: H } = args;
  const safe = safeAreaBox(W, H);
  const gap = Math.round(H * 0.012);

  const ctaHeight = Math.round(H * 0.065);
  const cta: Box = { x: safe.x, y: boxBottom(safe) - gap - ctaHeight, width: safe.width, height: ctaHeight };
  const lowestCaption = args.hasCta ? cta.y - gap : boxBottom(safe) - gap;

  let caption: CaptionBox;
  switch (args.captionPosition) {
    case "center":
      caption = { x: safe.x, y: Math.round(H * 0.42), width: safe.width, height: Math.round(H * 0.2), align: "center" };
      break;
    case "lower_third": {
      const y = Math.round(H * 0.58);
      caption = { x: safe.x, y, width: safe.width, height: Math.min(Math.round(H * 0.16), lowestCaption - y), align: "center" };
      break;
    }
    case "bottom": {
      const y = Math.round(H * 0.56);
      caption = { x: safe.x, y, width: safe.width, height: lowestCaption - y, align: "end" };
      break;
    }
  }

  const verseTop = safe.y + Math.round(H * 0.02);
  const verse: Box = { x: safe.x, y: verseTop, width: safe.width, height: Math.round(H * 0.4) - verseTop };

  const logoSize = Math.round(W * 0.11);
  const margin = Math.round(W * 0.03);
  const left = safe.x;
  const right = boxRight(safe) - logoSize;
  const top = safe.y + margin;
  const bottom = (args.hasCta ? cta.y - gap : boxBottom(safe) - margin) - logoSize;
  const logoPos: Record<BrandKit["watermarkPosition"], [number, number]> = {
    top_left: [left, top],
    top_right: [right, top],
    bottom_left: [left, bottom],
    bottom_right: [right, bottom],
  };
  const [lx, ly] = logoPos[args.watermarkPosition];
  const logo: Box = { x: lx, y: ly, width: logoSize, height: logoSize };

  const title: Box = { x: safe.x, y: Math.round(H * 0.3), width: safe.width, height: Math.round(H * 0.3) };
  return { safe, caption, verse, cta, logo, title };
}

/** Rough characters-per-line for a bold sans font; used to keep caption pages to two lines. */
export function charsPerLine(boxWidth: number, fontSizePx: number, uppercase: boolean): number {
  const avgCharEm = uppercase ? 0.68 : 0.56;
  return Math.max(6, Math.floor(boxWidth / (fontSizePx * avgCharEm)));
}

/** Verse cards shrink their text as the verse gets longer so it fits the upper band. */
export function verseFontSize(text: string, boxWidth: number, boxHeight: number): number {
  const len = text.trim().length;
  let size = 64;
  while (size > 30) {
    const perLine = Math.floor((boxWidth - 112) / (size * 0.5));
    const lines = Math.ceil(len / Math.max(1, perLine));
    const blockHeight = lines * size * 1.32 + 170;
    if (blockHeight <= boxHeight) break;
    size -= 2;
  }
  return size;
}
