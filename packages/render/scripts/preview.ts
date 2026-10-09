/**
 * Render a sample video from generated fixtures:
 *   pnpm --filter @media-studio/render preview
 * Writes data/preview-branded.mp4 and data/preview-clean.mp4 inside this package.
 */
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { estimateWordTimings } from "@media-studio/core";
import { probeMedia, renderVideo } from "../src";
import { FIXTURE_SCRIPT, buildFixtureInput, makeFixtureAssets } from "../src/testing/fixtures";

const dataDir = fileURLToPath(new URL("../data/", import.meta.url));

async function main() {
  await mkdir(dataDir, { recursive: true });
  const assets = await makeFixtureAssets(`${dataDir}fixtures`, { stills: 3, narrationSec: 5.6, clipSec: 1.5, musicSec: 4 });
  const words = estimateWordTimings(FIXTURE_SCRIPT, 5.6, 0.2);
  const plan = [
    { use: 0, durationSec: 1.8, movement: "push_in" as const },
    { use: "clip" as const, durationSec: 1.6 },
    { use: 1, durationSec: 1.6, movement: "pan_left" as const },
    { use: 2, durationSec: 1.6, movement: "pull_out" as const },
  ];
  for (const branded of [true, false]) {
    const input = buildFixtureInput(assets, {
      totalSec: 6.6,
      plan,
      words,
      branded,
      captionStyle: "karaoke_highlight",
      verse: { text: "He split the rock and the waters gushed out.", ref: "Psalm 105:41", startSec: 4.2, durationSec: 2.2 },
    });
    const outputPath = `${dataDir}preview-${branded ? "branded" : "clean"}.mp4`;
    const started = Date.now();
    await renderVideo(input, { outputPath, onProgress: (p) => process.stdout.write(`\r${branded ? "branded" : "clean"} ${(p * 100).toFixed(0)}%`) });
    const info = await probeMedia(outputPath);
    console.log(`\n${outputPath}: ${info.width}x${info.height} ${info.durationSec.toFixed(2)}s audio=${info.hasAudio} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
