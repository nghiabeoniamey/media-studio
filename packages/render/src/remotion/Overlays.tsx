import type { RenderInput } from "@media-studio/core";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { verseFontSize, type Box, type OverlayLayout } from "../lib/layout";
import { SERIF_STACK, sansStack, withAlpha } from "../lib/style";
import type { BrandTimeline } from "../lib/timeline";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
type Brand = NonNullable<RenderInput["brand"]>;
type Verse = NonNullable<RenderInput["verse"]>;

function boxStyle(b: Box): React.CSSProperties {
  return { position: "absolute", left: b.x, top: b.y, width: b.width, height: b.height };
}

/** Enter/exit envelope for an overlay living in a Sequence of `durationFrames`. */
function useEnvelope(durationFrames: number, inFrames = 12, outFrames = 10): { enter: number; exit: number } {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: inFrames });
  const exit = interpolate(frame, [durationFrames - outFrames, durationFrames], [1, 0], CLAMP);
  return { enter, exit };
}

function quoted(text: string): string {
  const t = text.trim();
  return /^["“'‘]/.test(t) ? t : `“${t}”`;
}

export const VerseCard: React.FC<{ verse: Verse; box: Box; accent: string; durationFrames: number }> = ({
  verse,
  box,
  accent,
  durationFrames,
}) => {
  const { enter, exit } = useEnvelope(durationFrames, 16, 12);
  const fontSize = verseFontSize(verse.text, box.width, box.height);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ ...boxStyle(box), display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            opacity: Math.min(enter, exit),
            transform: `translateY(${((1 - enter) * 28).toFixed(2)}px) scale(${(0.97 + 0.03 * enter).toFixed(4)})`,
            maxWidth: box.width,
            boxSizing: "border-box",
            padding: "48px 56px 42px",
            borderRadius: 34,
            background: "linear-gradient(180deg, rgba(14,14,20,0.70), rgba(8,8,12,0.62))",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 24px 70px rgba(0,0,0,0.38)",
            textAlign: "center",
          }}
        >
          <div style={{ width: 64, height: 4, borderRadius: 2, background: accent, margin: "0 auto 30px" }} />
          <div
            style={{
              fontFamily: SERIF_STACK,
              fontSize,
              lineHeight: 1.32,
              color: "#FFFFFF",
              textWrap: "pretty",
              textShadow: "0 2px 10px rgba(0,0,0,0.35)",
            }}
          >
            {quoted(verse.text)}
          </div>
          <div
            style={{
              marginTop: 28,
              fontFamily: sansStack("Inter"),
              fontWeight: 700,
              fontSize: Math.round(Math.max(26, fontSize * 0.52)),
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: accent,
            }}
          >
            {verse.ref}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Logo watermark, hidden while the intro/outro cards (which show the logo themselves) are up. */
export const Watermark: React.FC<{ brand: Brand; box: Box; timeline: BrandTimeline }> = ({ brand, box, timeline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!brand.logoSrc) return null;
  const t = frame / fps;
  let visible = 1;
  if (timeline.intro) visible = Math.min(visible, interpolate(t, [timeline.intro.endSec - 0.2, timeline.intro.endSec + 0.3], [0, 1], CLAMP));
  if (timeline.outro) visible = Math.min(visible, interpolate(t, [timeline.outro.startSec, timeline.outro.startSec + 0.3], [1, 0], CLAMP));
  if (visible <= 0) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Img
        src={brand.logoSrc}
        style={{ ...boxStyle(box), objectFit: "contain", opacity: brand.watermarkOpacity * visible, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.35))" }}
      />
    </AbsoluteFill>
  );
};

export const CtaLowerThird: React.FC<{ brand: Brand; box: Box; durationFrames: number }> = ({ brand, box, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slide = spring({ frame, fps, config: { damping: 18, stiffness: 140, mass: 0.8 } });
  const exit = interpolate(frame, [durationFrames - 9, durationFrames], [1, 0], CLAMP);
  const x = interpolate(slide, [0, 1], [-box.width * 0.6, 0]);
  const fontSize = Math.round(box.height * 0.34);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ ...boxStyle(box), display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
        <div
          style={{
            transform: `translateX(${x.toFixed(2)}px)`,
            opacity: Math.min(1, slide * 1.4) * exit,
            display: "flex",
            alignItems: "center",
            gap: 22,
            maxWidth: box.width,
            boxSizing: "border-box",
            padding: `0 ${Math.round(fontSize * 0.9)}px 0 0`,
            height: box.height * 0.82,
            borderRadius: box.height,
            background: withAlpha(brand.primaryColor, 0.88),
            boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
            overflow: "hidden",
          }}
        >
          <div style={{ alignSelf: "stretch", width: Math.round(box.height * 0.14), background: brand.accentColor }} />
          <div
            style={{
              fontFamily: sansStack(brand.fontFamily),
              fontWeight: 700,
              fontSize,
              color: "#FFFFFF",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {brand.ctaText}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const IntroCard: React.FC<{ brand: Brand; layout: OverlayLayout; durationFrames: number }> = ({
  brand,
  layout,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 10 });
  const exit = interpolate(frame, [durationFrames - 10, durationFrames], [1, 0], CLAMP);
  const bar = spring({ frame: frame - 4, fps, config: { damping: 200 }, durationInFrames: 14 });
  const scale = interpolate(frame, [0, durationFrames], [1.06, 1.0], CLAMP);
  return (
    <AbsoluteFill style={{ opacity: exit, pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${withAlpha(brand.primaryColor, 0.55)} 0%, ${withAlpha(brand.primaryColor, 0.35)} 55%, rgba(0,0,0,0) 100%)`,
          opacity: enter,
        }}
      />
      <div
        style={{
          ...boxStyle(layout.title),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 26,
          opacity: enter,
          transform: `scale(${scale.toFixed(4)})`,
        }}
      >
        {brand.logoSrc ? <Img src={brand.logoSrc} style={{ width: 150, height: 150, objectFit: "contain" }} /> : null}
        <div
          style={{
            fontFamily: sansStack(brand.fontFamily),
            fontWeight: 800,
            fontSize: 84,
            lineHeight: 1.1,
            color: "#FFFFFF",
            textAlign: "center",
            textWrap: "balance",
            textShadow: "0 6px 30px rgba(0,0,0,0.5)",
          }}
        >
          {brand.intro.text}
        </div>
        <div style={{ width: 180 * bar, height: 6, borderRadius: 3, background: brand.accentColor }} />
      </div>
    </AbsoluteFill>
  );
};

export const OutroCard: React.FC<{ brand: Brand; layout: OverlayLayout; durationFrames: number }> = ({
  brand,
  layout,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bg = interpolate(frame, [0, Math.min(15, durationFrames)], [0, 1], CLAMP);
  const pop = spring({ frame: frame - 4, fps, config: { damping: 15, stiffness: 120, mass: 0.8 } });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 45%, ${withAlpha(brand.primaryColor, 0.8)} 0%, ${withAlpha(brand.primaryColor, 0.94)} 70%)`,
          opacity: bg,
        }}
      />
      <div
        style={{
          ...boxStyle(layout.title),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 34,
          opacity: Math.min(1, pop * 1.3),
          transform: `scale(${interpolate(pop, [0, 1], [0.9, 1]).toFixed(4)})`,
        }}
      >
        {brand.logoSrc ? <Img src={brand.logoSrc} style={{ width: 200, height: 200, objectFit: "contain" }} /> : null}
        {brand.outro.text ? (
          <div
            style={{
              fontFamily: sansStack(brand.fontFamily),
              fontWeight: 800,
              fontSize: 66,
              lineHeight: 1.15,
              color: "#FFFFFF",
              textAlign: "center",
              textWrap: "balance",
            }}
          >
            {brand.outro.text}
          </div>
        ) : null}
        <div style={{ width: 140, height: 6, borderRadius: 3, background: brand.accentColor }} />
      </div>
    </AbsoluteFill>
  );
};
