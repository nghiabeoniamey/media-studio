import type { CaptionPreset } from "@media-studio/core";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { activePageIndex, activeTokenIndex, type CaptionPage } from "../lib/captions";
import type { CaptionBox } from "../lib/layout";
import { sansStack } from "../lib/style";
import { smoothstep } from "../lib/timeline";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

function textOutline(preset: CaptionPreset): React.CSSProperties {
  if (preset.strokeWidthPx <= 0) return {};
  // paint-order puts the stroke behind the fill, so only the outer half shows: double it.
  return {
    WebkitTextStroke: `${preset.strokeWidthPx * 2}px ${preset.strokeColor}`,
    paintOrder: "stroke fill",
  };
}

export const CaptionLayer: React.FC<{
  pages: CaptionPage[];
  preset: CaptionPreset;
  box: CaptionBox;
  /** Captions fade out from this time on (outro card). */
  hideFromSec: number | null;
}> = ({ pages, preset, box, hideFromSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const idx = activePageIndex(pages, t);
  if (idx < 0) return null;
  const page = pages[idx]!;
  const hide = hideFromSec === null ? 1 : 1 - smoothstep(hideFromSec, hideFromSec + 0.3, t);
  if (hide <= 0) return null;

  const pageFrame = frame - Math.round(page.startSec * fps);
  const endFrame = Math.round(page.endSec * fps);
  const next = pages[idx + 1];
  // Pages that hand over directly to the next page switch instantly (TikTok style); others fade.
  const handsOver = next !== undefined && next.startSec - page.endSec < 0.05;
  const soft = preset.style === "cinematic_subtitle" || preset.style === "minimal";
  const fadeOut = handsOver && !soft ? 1 : interpolate(frame, [endFrame - 5, endFrame], [1, 0], CLAMP);
  const fadeIn = soft ? interpolate(pageFrame, [0, 5], [0, 1], CLAMP) : 1;
  const enter = spring({ frame: pageFrame, fps, config: { damping: 200 }, durationInFrames: 6 });

  const base: React.CSSProperties = {
    fontFamily: sansStack(preset.fontFamily),
    fontSize: preset.fontSizePx,
    color: preset.textColor,
    textTransform: preset.uppercase ? "uppercase" : "none",
    lineHeight: 1.18,
    letterSpacing: preset.uppercase ? "0.01em" : "-0.005em",
    textShadow: "0 4px 18px rgba(0,0,0,0.45)",
    ...textOutline(preset),
  };

  let content: React.ReactNode;
  const current = activeTokenIndex(page, t);
  switch (preset.style) {
    case "word_pop": {
      content = page.tokens.map((tok, i) => {
        if (i > current) return null;
        const pop = spring({
          frame: frame - Math.round(tok.startSec * fps),
          fps,
          config: { damping: 11, stiffness: 220, mass: 0.6 },
        });
        const scale = interpolate(pop, [0, 1], [0.55, 1]);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              margin: "0 0.14em",
              fontWeight: 900,
              color: i === current ? preset.highlightColor : preset.textColor,
              transform: `scale(${scale.toFixed(4)})`,
            }}
          >
            {tok.text}
          </span>
        );
      });
      break;
    }
    case "karaoke_highlight": {
      content = page.tokens.map((tok, i) => {
        const active = i === current && t < tok.endSec + 0.35;
        const pop = active
          ? spring({ frame: frame - Math.round(tok.startSec * fps), fps, config: { damping: 14, stiffness: 260, mass: 0.5 } })
          : 0;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              margin: "0 0.12em",
              fontWeight: 800,
              color: active ? preset.highlightColor : preset.textColor,
              transform: `scale(${(1 + 0.08 * pop).toFixed(4)})`,
            }}
          >
            {tok.text}
          </span>
        );
      });
      break;
    }
    case "cinematic_subtitle":
    case "minimal": {
      content = <span style={{ fontWeight: preset.style === "minimal" ? 600 : 650 }}>{page.text}</span>;
      break;
    }
  }

  const lift = preset.style === "word_pop" ? 0 : (1 - enter) * 10;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: box.x,
          top: box.y,
          width: box.width,
          height: box.height,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: box.align === "end" ? "flex-end" : "center",
          opacity: hide * fadeOut * fadeIn,
        }}
      >
        <div
          style={{
            ...base,
            maxWidth: box.width,
            textAlign: "center",
            textWrap: "balance",
            overflowWrap: "break-word",
            transform: `translateY(${lift.toFixed(2)}px)`,
          }}
        >
          {content}
        </div>
      </div>
    </AbsoluteFill>
  );
};
