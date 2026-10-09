/**
 * Install whisper.cpp and a model for word-level caption alignment:
 *   WHISPER_CPP_DIR=/opt/whisper WHISPER_MODEL=base.en pnpm --filter @media-studio/render install-whisper
 * Needs network access to github.com and huggingface.co plus a C/C++ toolchain (make, g++).
 * Without it, alignWords falls back to estimated timings.
 */
import { downloadWhisperModel, installWhisperCpp } from "@remotion/install-whisper-cpp";
import { resolve } from "node:path";
import { detectWhisper } from "../src/align";

const MODELS = ["tiny.en", "base.en", "small.en", "medium.en"] as const;
type Model = (typeof MODELS)[number];

async function main() {
  const dir = resolve(process.env.WHISPER_CPP_DIR ?? "./data/whisper");
  const model = (process.env.WHISPER_MODEL ?? "base.en") as Model;
  if (!MODELS.includes(model)) throw new Error(`WHISPER_MODEL must be one of ${MODELS.join(", ")}`);
  if (detectWhisper(dir, model)) {
    console.log(`whisper.cpp with ${model} already installed in ${dir}`);
    return;
  }
  console.log(`installing whisper.cpp 1.5.5 into ${dir} ...`);
  await installWhisperCpp({ version: "1.5.5", to: dir, printOutput: true });
  console.log(`downloading model ${model} ...`);
  await downloadWhisperModel({ model, folder: dir, printOutput: true });
  if (!detectWhisper(dir, model)) throw new Error(`install finished but whisper.cpp was not detected in ${dir}`);
  console.log("done");
}

main().catch((err) => {
  console.error(`whisper.cpp install failed: ${err instanceof Error ? err.message : String(err)}`);
  console.error("Captions will use estimated word timings. Check network access to github.com / huggingface.co and that make + g++ are installed.");
  process.exit(1);
});
