import {
  BrandKit,
  CaptionPreset,
  kenBurnsFor,
  RENDER_DEFAULTS,
  type CameraMovement,
  type RenderInput,
  type RenderShot,
  type WordTiming,
} from "@media-studio/core";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { ffmpeg } from "../ffmpeg";

export const FIXTURE_SCRIPT =
  "The people were thirsty in the desert. Moses struck the rock, and water rushed out. God provided, again and again.";

export interface FixtureInputOptions {
  totalSec: number;
  /** Shot plan: stills by index into assets.stills, "clip" for the hero clip. */
  plan: { use: number | "clip"; durationSec: number; movement?: CameraMovement }[];
  words: WordTiming[];
  narrationStartSec?: number;
  captionStyle?: CaptionPreset["style"];
  captionPosition?: CaptionPreset["position"];
  branded: boolean;
  verse?: { text: string; ref: string; startSec: number; durationSec: number } | null;
}

/** Assemble a RenderInput over fixture assets (Ken Burns plans come from core's kenBurnsFor). */
export function buildFixtureInput(assets: FixtureAssets, opts: FixtureInputOptions): RenderInput {
  let t = 0;
  const shots: RenderShot[] = opts.plan.map((p, index) => {
    const shot: RenderShot = {
      index,
      startSec: t,
      durationSec: p.durationSec,
      kind: p.use === "clip" ? "clip" : "still",
      src: p.use === "clip" ? assets.clip : assets.stills[p.use]!,
      kenBurns: kenBurnsFor(p.movement ?? "push_in"),
      clipDurationSec: p.use === "clip" ? assets.clipDurationSec : null,
    };
    t += p.durationSec;
    return shot;
  });
  const narrationStart = opts.narrationStartSec ?? 0;
  return {
    ...RENDER_DEFAULTS,
    totalDurationSec: opts.totalSec,
    shots,
    narration: { src: assets.narration, durationSec: assets.narrationDurationSec, startSec: narrationStart },
    music: { src: assets.music, durationSec: assets.musicDurationSec, volume: 0.6 },
    captions: {
      words: opts.words.map((w) => ({ ...w, startSec: w.startSec + narrationStart, endSec: w.endSec + narrationStart })),
      preset: CaptionPreset.parse({
        style: opts.captionStyle ?? "karaoke_highlight",
        fontSizePx: 68,
        highlightColor: "#F5C451",
        position: opts.captionPosition ?? "lower_third",
        maxWordsPerPage: 4,
      }),
    },
    verse: opts.verse === undefined ? null : opts.verse,
    brand: opts.branded
      ? {
          ...BrandKit.parse({
            ctaText: "Follow for a Bible story every day",
            watermarkPosition: "top_right",
            intro: { enabled: true, text: "Water from the Rock", durationSec: 1.2 },
            outro: { enabled: true, text: "Follow for a Bible story every day", durationSec: 1.2 },
          }),
          logoSrc: assets.logo,
        }
      : null,
  };
}

export interface FixtureAssets {
  stills: string[];
  clip: string;
  clipDurationSec: number;
  narration: string;
  narrationDurationSec: number;
  music: string;
  musicDurationSec: number;
  logo: string;
}

const STILL_SIZE = "1080x1920";

/** Gradient "keyframes" with enough structure (grid, sun, horizon) to make camera motion visible. */
async function makeStill(out: string, variant: number, label: string): Promise<void> {
  const palettes = [
    ["0x2b1055", "0xd76d77", "0xffaf7b"],
    ["0x0f2027", "0x2c5364", "0x8fd3c7"],
    ["0x3a1c71", "0xd76d77", "0xffaf7b"],
    ["0x141e30", "0x35577d", "0xe0c3a0"],
  ];
  const [c0, c1, c2] = palettes[variant % palettes.length]!;
  const filters = [
    `drawgrid=w=120:h=120:t=2:c=white@0.10`,
    `drawbox=x=0:y=1180:w=1080:h=740:color=black@0.35:t=fill`,
    `drawbox=x=${380 + variant * 40}:y=${560 + variant * 30}:w=320:h=320:color=0xfff2c0@0.85:t=fill`,
    `drawbox=x=120:y=1240:w=840:h=24:color=white@0.25:t=fill`,
    `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text=${label}:fontsize=150:fontcolor=white@0.85:x=(w-text_w)/2:y=1420`,
  ];
  await ffmpeg([
    "-f",
    "lavfi",
    "-i",
    `gradients=s=${STILL_SIZE}:c0=${c0}:c1=${c1}:c2=${c2}:nb_colors=3:x0=0:y0=0:x1=1080:y1=1920:d=1:r=1`,
    "-frames:v",
    "1",
    "-vf",
    filters.join(","),
    out,
  ]);
}

/**
 * Small, deterministic media set for tests and the preview: gradient stills, a short
 * test-pattern clip, a speech-like narration with sentence pauses, a music bed and a logo.
 */
export async function makeFixtureAssets(
  dir: string,
  opts: { stills?: number; narrationSec?: number; clipSec?: number; musicSec?: number } = {},
): Promise<FixtureAssets> {
  await mkdir(dir, { recursive: true });
  const stillCount = opts.stills ?? 3;
  const narrationSec = opts.narrationSec ?? 5.6;
  const clipSec = opts.clipSec ?? 1.5;
  const musicSec = opts.musicSec ?? 4;

  const stills = Array.from({ length: stillCount }, (_, i) => join(dir, `still-${i + 1}.png`));
  await Promise.all(stills.map((p, i) => makeStill(p, i, `SHOT ${i + 1}`)));

  const clip = join(dir, "clip.mp4");
  await ffmpeg([
    "-f",
    "lavfi",
    "-i",
    `testsrc2=s=720x1280:r=24:d=${clipSec}`,
    "-vf",
    "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text=HERO CLIP:fontsize=72:fontcolor=white:box=1:boxcolor=black@0.5:x=(w-text_w)/2:y=h*0.7",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "veryfast",
    clip,
  ]);

  // Voice-like bursts (pitch wobble + syllable-rate envelope) separated by sentence pauses.
  const narration = join(dir, "narration.wav");
  const bursts: [number, number][] = [];
  const sentence = Math.max(0.8, (narrationSec - 0.6) / 3 - 0.4);
  for (let k = 0, t = 0.3; k < 3; k++, t += sentence + 0.4) bursts.push([t, Math.min(narrationSec - 0.2, t + sentence)]);
  const gate = bursts.map(([a, b]) => `between(t,${a.toFixed(2)},${b.toFixed(2)})`).join("+");
  await ffmpeg([
    "-f",
    "lavfi",
    "-i",
    `aevalsrc=exprs='0.5*(${gate})*(0.55+0.45*sin(2*PI*5*t))*sin(2*PI*(160+25*sin(2*PI*1.3*t))*t)':s=44100:d=${narrationSec}`,
    "-ac",
    "1",
    "-c:a",
    "pcm_s16le",
    narration,
  ]);

  const music = join(dir, "music.wav");
  await ffmpeg([
    "-f",
    "lavfi",
    "-i",
    `aevalsrc=exprs='(0.18*sin(2*PI*220*t)+0.12*sin(2*PI*277.18*t)+0.12*sin(2*PI*329.63*t))*(0.8+0.2*sin(2*PI*0.5*t))':s=44100:d=${musicSec}`,
    "-ac",
    "2",
    "-c:a",
    "pcm_s16le",
    music,
  ]);

  const logo = join(dir, "logo.png");
  await ffmpeg([
    "-f",
    "lavfi",
    "-i",
    "color=c=black@0:s=256x256,format=rgba",
    "-frames:v",
    "1",
    "-vf",
    "geq=r='232':g='176':b='74':a='if(lt(hypot(X-128,Y-128),118),255,0)'," +
      "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text=MS:fontsize=110:fontcolor=0x1b1b1f:x=(w-text_w)/2:y=(h-text_h)/2",
    logo,
  ]);

  return {
    stills,
    clip,
    clipDurationSec: clipSec,
    narration,
    narrationDurationSec: narrationSec,
    music,
    musicDurationSec: musicSec,
    logo,
  };
}
