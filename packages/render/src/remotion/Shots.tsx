import type { KenBurnsPlan } from "@media-studio/core";
import { AbsoluteFill, Freeze, Img, interpolate, OffthreadVideo, random, useCurrentFrame, useVideoConfig } from "remotion";
import { clipFramePlan, depthLayerTransform, kenBurnsTransform, smoothstep, type FrameTransform } from "../lib/timeline";

const COVER: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };

function transformCss(t: FrameTransform, width: number, height: number): string {
  return `translate3d(${(t.x * width).toFixed(2)}px, ${(t.y * height).toFixed(2)}px, 0) scale(${t.scale.toFixed(5)})`;
}

function useFadeIn(fadeInFrames: number): number {
  const frame = useCurrentFrame();
  if (fadeInFrames <= 0) return 1;
  return interpolate(frame, [0, fadeInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}

/** Sharp centre, softly blurred edges: the depth layer shows through where this mask fades out. */
const LENS_MASK = "radial-gradient(ellipse 72% 58% at 50% 46%, #000 52%, rgba(0,0,0,0.6) 74%, rgba(0,0,0,0) 100%)";

/**
 * A still with a Ken Burns move plus a "lens" depth layer: a blurred copy of the image
 * moves more slowly than the sharp centre, so edges drift against the subject like a
 * shallow-focus camera move instead of a flat slideshow pan.
 */
export const StillShot: React.FC<{
  src: string;
  depthSrc: string | null;
  plan: KenBurnsPlan;
  slotFrames: number;
  fadeInFrames: number;
}> = ({ src, depthSrc, plan, slotFrames, fadeInFrames }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const opacity = useFadeIn(fadeInFrames);
  const progress = slotFrames > 1 ? frame / (slotFrames - 1) : 0;
  const fg = kenBurnsTransform(plan, progress);
  const bg = depthLayerTransform(fg);
  const maskStyle: React.CSSProperties = { WebkitMaskImage: LENS_MASK, maskImage: LENS_MASK };
  return (
    <AbsoluteFill style={{ opacity, backgroundColor: "#000" }}>
      <AbsoluteFill style={{ transform: transformCss(bg, width, height) }}>
        <Img
          src={depthSrc ?? src}
          style={{ ...COVER, filter: depthSrc ? "brightness(0.82) saturate(1.08)" : "blur(22px) brightness(0.82)" }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={maskStyle}>
        <AbsoluteFill style={{ transform: transformCss(fg, width, height) }}>
          <Img src={src} style={COVER} />
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * A hero clip fitted to its slot: trimmed when longer; when shorter, slowed to at most
 * 0.8× and then held on its last frame with a gentle push-in so the hold does not look dead.
 */
export const ClipShot: React.FC<{
  src: string;
  clipDurationSec: number | null;
  slotFrames: number;
  fadeInFrames: number;
}> = ({ src, clipDurationSec, slotFrames, fadeInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = useFadeIn(fadeInFrames);
  const plan = clipFramePlan(clipDurationSec, slotFrames, fps);
  const holdProgress = plan.holdFrames > 0 ? smoothstep(plan.playFrames, slotFrames, frame) : 0;
  const scale = 1 + 0.045 * holdProgress;
  return (
    <AbsoluteFill style={{ opacity, backgroundColor: "#000" }}>
      <AbsoluteFill style={{ transform: `scale(${scale.toFixed(5)})` }}>
        <Freeze frame={plan.freezeAt} active={(f) => f >= plan.playFrames}>
          <OffthreadVideo src={src} muted playbackRate={plan.playbackRate} style={COVER} />
        </Freeze>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const GRAIN_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'>" +
  "<filter id='n' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>" +
  "<feColorMatrix type='matrix' values='1.6 0 0 0 -0.3  1.6 0 0 0 -0.3  1.6 0 0 0 -0.3  0 0 0 0 1'/></filter>" +
  "<rect width='100%' height='100%' filter='url(#n)'/></svg>";
const GRAIN_URL = `url("data:image/svg+xml;utf8,${encodeURIComponent(GRAIN_SVG)}")`;

/** Vignette, a soft floor gradient for caption contrast, and animated film grain. */
export const FilmLook: React.FC = () => {
  const frame = useCurrentFrame();
  const gx = Math.floor(random(`gx-${frame}`) * 256);
  const gy = Math.floor(random(`gy-${frame}`) * 256);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{ background: "radial-gradient(ellipse 85% 70% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.42) 100%)" }}
      />
      <AbsoluteFill
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 52%, rgba(0,0,0,0.18) 72%, rgba(0,0,0,0.38) 100%)" }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: GRAIN_URL,
          backgroundSize: "256px 256px",
          backgroundPosition: `${gx}px ${gy}px`,
          opacity: 0.09,
          mixBlendMode: "overlay",
        }}
      />
    </AbsoluteFill>
  );
};
