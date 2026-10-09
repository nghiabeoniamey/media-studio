import {
  UnknownPriceError,
  imageCost,
  llmCost,
  musicCost,
  ttsCost,
  videoCost,
  type LlmPrice,
  type Usage,
  type VideoResolution,
} from "@media-studio/core";

/**
 * Models that can serve a request through Anthropic's server-side refusal fallback but are not
 * in core's LLM_PRICES (list prices from the claude-api reference, 2026-10). Requested upstream
 * as a contract change; kept here so a fallback never crashes cost booking after the vendor billed.
 */
const FALLBACK_LLM_PRICES: Record<string, LlmPrice> = {
  "anthropic:claude-opus-5": { inputPerMTok: 5, outputPerMTok: 25, batchMultiplier: 0.5 },
  "anthropic:claude-opus-4-8": { inputPerMTok: 5, outputPerMTok: 25, batchMultiplier: 0.5 },
  "anthropic:claude-sonnet-5": { inputPerMTok: 2, outputPerMTok: 10, batchMultiplier: 0.5 },
  "anthropic:claude-fable-5-1": { inputPerMTok: 10, outputPerMTok: 50, batchMultiplier: 0.5 },
};

const warned = new Set<string>();

function unknownPrice(what: string): number {
  if (!warned.has(what)) {
    warned.add(what);
    console.warn(`[providers] no price on file for ${what}; booking $0 — add it to packages/core/src/pricing.ts`);
  }
  return 0;
}

/**
 * Price a call that already happened. An unknown price must never throw here: the vendor has
 * billed, and a throw would make the workflow step retry (and bill) again.
 */
function priced(what: string, fn: () => number): number {
  try {
    return fn();
  } catch (err) {
    if (err instanceof UnknownPriceError) return unknownPrice(what);
    throw err;
  }
}

export function llmTokenCost(provider: string, model: string, inputTokens: number, outputTokens: number): { input: number; output: number } {
  const key = `${provider}:${model}`;
  const extra = FALLBACK_LLM_PRICES[key];
  try {
    return {
      input: llmCost(provider, model, inputTokens, 0),
      output: llmCost(provider, model, 0, outputTokens),
    };
  } catch (err) {
    if (!(err instanceof UnknownPriceError)) throw err;
    if (extra) {
      return { input: (inputTokens * extra.inputPerMTok) / 1e6, output: (outputTokens * extra.outputPerMTok) / 1e6 };
    }
    unknownPrice(key);
    return { input: 0, output: 0 };
  }
}

export function llmUsage(
  provider: string,
  model: string,
  operation: string,
  tokens: { input: number; output: number; cacheWrite?: number; cacheRead?: number },
): Usage[] {
  const cacheWrite = tokens.cacheWrite ?? 0;
  const cacheRead = tokens.cacheRead ?? 0;
  const base = llmTokenCost(provider, model, tokens.input, tokens.output);
  // Cache writes bill at 1.25x input, cache reads at 0.1x input (Anthropic prompt caching).
  const perInputToken = tokens.input > 0 ? base.input / tokens.input : llmTokenCost(provider, model, 1_000_000, 0).input / 1e6;
  const inputCost = base.input + cacheWrite * perInputToken * 1.25 + cacheRead * perInputToken * 0.1;
  return [
    { provider, model, operation, units: tokens.input + cacheWrite + cacheRead, unitType: "input_token", costUsd: inputCost },
    { provider, model, operation, units: tokens.output, unitType: "output_token", costUsd: base.output },
  ];
}

export function imageUsage(provider: string, model: string, operation: string, images = 1): Usage {
  return {
    provider,
    model,
    operation,
    units: images,
    unitType: "image",
    costUsd: priced(`${provider}:${model}`, () => imageCost(provider, model, images)),
  };
}

export function videoUsage(
  provider: string,
  model: string,
  operation: string,
  seconds: number,
  resolution: VideoResolution,
  inputImages = 0,
): Usage[] {
  const what = `${provider}:${model} at ${resolution}`;
  const usage: Usage[] = [
    {
      provider,
      model,
      operation,
      units: seconds,
      unitType: "video_second",
      costUsd: priced(what, () => videoCost(provider, model, seconds, resolution, 0)),
    },
  ];
  const refCost = priced(what, () => videoCost(provider, model, 0, resolution, inputImages));
  if (inputImages > 0) {
    usage.push({ provider, model, operation, units: inputImages, unitType: "reference_image", costUsd: refCost });
  }
  return usage;
}

export function ttsUsage(provider: string, model: string, seconds: number, characters: number, unit: "audio_second" | "character"): Usage {
  return {
    provider,
    model,
    operation: "tts",
    units: unit === "audio_second" ? seconds : characters,
    unitType: unit,
    costUsd: priced(`${provider}:${model}`, () => ttsCost(provider, model, seconds, characters)),
  };
}

export function musicUsage(provider: string, model: string): Usage {
  return {
    provider,
    model,
    operation: "music",
    units: 1,
    unitType: "request",
    costUsd: priced(`${provider}:${model}`, () => musicCost(provider, model, 1)),
  };
}
