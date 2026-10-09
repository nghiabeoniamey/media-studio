import { useMemo } from "react";
import { AbsoluteFill, Html5Audio, Sequence, useVideoConfig } from "remotion";
import { musicEnvelope, musicGain, musicSegments, seamGain, speechSegments } from "../lib/audio";
import { buildCaptionPages } from "../lib/captions";
import { charsPerLine, overlayLayout } from "../lib/layout";
import type { StoryVideoProps } from "../lib/style";
import { brandTimeline, planShotTimeline, secToFrame, verseWindow } from "../lib/timeline";
import { CaptionLayer } from "./Captions";
import { CtaLowerThird, IntroCard, OutroCard, VerseCard, Watermark } from "./Overlays";
import { ClipShot, FilmLook, StillShot } from "./Shots";

const DEFAULT_ACCENT = "#E8B04A";

export const StoryVideo: React.FC<StoryVideoProps> = ({ input, depthSrc }) => {
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const total = input.totalDurationSec;

  const timeline = useMemo(() => planShotTimeline(input.shots, total), [input.shots, total]);
  const brandTimes = useMemo(() => brandTimeline(total, input.brand), [input.brand, total]);
  const verseTimes = useMemo(() => verseWindow(input.verse, total, brandTimes.outro), [input.verse, total, brandTimes.outro]);
  const layout = useMemo(
    () =>
      overlayLayout({
        width,
        height,
        captionPosition: input.captions?.preset.position ?? "lower_third",
        watermarkPosition: input.brand?.watermarkPosition ?? "top_right",
        hasCta: brandTimes.cta !== null,
      }),
    [width, height, input.captions, input.brand, brandTimes.cta],
  );
  const pages = useMemo(() => {
    if (!input.captions) return [];
    const p = input.captions.preset;
    return buildCaptionPages(input.captions.words, p, {
      charsPerLine: charsPerLine(layout.caption.width, p.fontSizePx, p.uppercase),
      totalSec: total,
    });
  }, [input.captions, layout.caption.width, total]);

  const music = input.music;
  const musicPlan = useMemo(() => {
    if (!music) return null;
    const segments = speechSegments(input.captions?.words ?? null, input.narration);
    return { env: musicEnvelope(music.volume, total, segments), copies: musicSegments(music.durationSec, total) };
  }, [music, input.captions, input.narration, total]);

  const narrationFrom = secToFrame(input.narration.startSec, fps);
  const narrationFrames = Math.min(secToFrame(input.narration.durationSec, fps), durationInFrames - narrationFrom);
  const accent = input.brand?.accentColor ?? DEFAULT_ACCENT;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {timeline.map((ts) => {
        const from = secToFrame(ts.enterSec, fps);
        const slotFrames = Math.max(1, secToFrame(ts.exitSec, fps) - from);
        const fadeInFrames = Math.round(ts.fadeInSec * fps);
        return (
          <Sequence key={`shot-${ts.shot.index}-${from}`} from={from} durationInFrames={slotFrames} name={`shot ${ts.shot.index}`}>
            {ts.shot.kind === "clip" ? (
              <ClipShot src={ts.shot.src} clipDurationSec={ts.shot.clipDurationSec} slotFrames={slotFrames} fadeInFrames={fadeInFrames} />
            ) : (
              <StillShot
                src={ts.shot.src}
                depthSrc={depthSrc[String(ts.shot.index)] ?? null}
                plan={ts.shot.kenBurns}
                slotFrames={slotFrames}
                fadeInFrames={fadeInFrames}
              />
            )}
          </Sequence>
        );
      })}

      <FilmLook />

      {input.verse && verseTimes ? (
        <Sequence
          from={secToFrame(verseTimes.startSec, fps)}
          durationInFrames={Math.max(1, secToFrame(verseTimes.endSec - verseTimes.startSec, fps))}
          name="verse"
        >
          <VerseCard
            verse={input.verse}
            box={layout.verse}
            accent={accent}
            durationFrames={Math.max(1, secToFrame(verseTimes.endSec - verseTimes.startSec, fps))}
          />
        </Sequence>
      ) : null}

      {input.captions && pages.length > 0 ? (
        <CaptionLayer
          pages={pages}
          preset={input.captions.preset}
          box={layout.caption}
          hideFromSec={brandTimes.outro ? brandTimes.outro.startSec : null}
        />
      ) : null}

      {input.brand ? (
        <>
          <Watermark brand={input.brand} box={layout.logo} timeline={brandTimes} />
          {brandTimes.cta ? (
            <Sequence
              from={secToFrame(brandTimes.cta.startSec, fps)}
              durationInFrames={Math.max(1, secToFrame(brandTimes.cta.endSec - brandTimes.cta.startSec, fps))}
              name="cta"
            >
              <CtaLowerThird
                brand={input.brand}
                box={layout.cta}
                durationFrames={Math.max(1, secToFrame(brandTimes.cta.endSec - brandTimes.cta.startSec, fps))}
              />
            </Sequence>
          ) : null}
          {brandTimes.intro ? (
            <Sequence from={0} durationInFrames={Math.max(1, secToFrame(brandTimes.intro.endSec, fps))} name="intro">
              <IntroCard brand={input.brand} layout={layout} durationFrames={Math.max(1, secToFrame(brandTimes.intro.endSec, fps))} />
            </Sequence>
          ) : null}
          {brandTimes.outro ? (
            <Sequence from={secToFrame(brandTimes.outro.startSec, fps)} name="outro">
              <OutroCard
                brand={input.brand}
                layout={layout}
                durationFrames={Math.max(1, durationInFrames - secToFrame(brandTimes.outro.startSec, fps))}
              />
            </Sequence>
          ) : null}
        </>
      ) : null}

      {input.narration.src && narrationFrames > 0 ? (
        <Sequence from={narrationFrom} durationInFrames={narrationFrames} layout="none" name="narration">
          <Html5Audio src={input.narration.src} />
        </Sequence>
      ) : null}

      {music && musicPlan
        ? musicPlan.copies.map((seg, i) => {
            const from = secToFrame(seg.startSec, fps);
            const frames = Math.min(secToFrame(seg.durationSec, fps), durationInFrames - from);
            if (frames <= 0) return null;
            return (
              <Sequence key={`music-${i}`} from={from} durationInFrames={frames} layout="none" name={`music ${i + 1}`}>
                <Html5Audio
                  src={music.src}
                  volume={(f) => musicGain((from + f) / fps, musicPlan.env) * seamGain(f / fps, seg)}
                />
              </Sequence>
            );
          })
        : null}
    </AbsoluteFill>
  );
};
