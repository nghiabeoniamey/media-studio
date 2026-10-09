import Anthropic from "@anthropic-ai/sdk";
import { transformJSONSchema } from "@anthropic-ai/sdk/lib/transform-json-schema";
import type { BetaContentBlockParam, BetaMessage, BetaMessageStreamParams } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { ProviderError, type LlmProvider, type LlmRequest, type LlmResult, type Usage } from "@media-studio/core";
import { z } from "zod";
import { toProviderError } from "./errors";
import { bytesToBase64, mediaInputToBytes } from "./media";
import { llmUsage } from "./pricing";

const PROVIDER = "anthropic";

/** Models that accept the server-side refusal fallback (`fallbacks: "default"`). Haiku 5.5 has none. */
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-1"]);
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
type Effort = (typeof EFFORTS)[number];

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export interface AnthropicLlmOptions {
  apiKey: string;
  fetch?: typeof fetch;
  maxRetries?: number;
  /** Injected for tests; otherwise built from apiKey/fetch. */
  client?: Anthropic;
}

/** Zod → JSON Schema in the subset structured outputs accept (unsupported keywords move into descriptions). */
export function outputSchemaFor(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { reused: "ref" }) as Record<string, unknown>;
  delete json.$schema;
  return transformJSONSchema(json) as Record<string, unknown>;
}

function effortOf(options: Record<string, unknown>): Effort | undefined {
  const effort = options.effort;
  return typeof effort === "string" && (EFFORTS as readonly string[]).includes(effort) ? (effort as Effort) : undefined;
}

/**
 * Bill every attempt. With server-side fallbacks `usage.iterations` lists the declined attempt(s)
 * and the serving one, each at its own model's rates; top-level usage covers only the last one.
 */
export function anthropicUsage(message: Pick<BetaMessage, "usage" | "model">, requestedModel: string): Usage[] {
  const iterations = message.usage.iterations;
  if (iterations && iterations.length > 0) {
    const usage: Usage[] = [];
    for (const it of iterations) {
      if (it.type !== "message" && it.type !== "fallback_message") continue;
      const model = it.model ?? requestedModel;
      usage.push(
        ...llmUsage(PROVIDER, model, it.type === "fallback_message" ? "generate_object_fallback" : "generate_object", {
          input: it.input_tokens,
          output: it.output_tokens,
          cacheWrite: it.cache_creation_input_tokens ?? 0,
          cacheRead: it.cache_read_input_tokens ?? 0,
        }),
      );
    }
    if (usage.length > 0) return usage;
  }
  const u = message.usage;
  return llmUsage(PROVIDER, message.model || requestedModel, "generate_object", {
    input: u.input_tokens,
    output: u.output_tokens,
    cacheWrite: u.cache_creation_input_tokens ?? 0,
    cacheRead: u.cache_read_input_tokens ?? 0,
  });
}

/** Text after the last `fallback` marker: a mid-stream decline keeps the declined partial before it. */
function finalText(message: BetaMessage): string {
  let start = 0;
  message.content.forEach((block, i) => {
    if (block.type === "fallback") start = i + 1;
  });
  return message.content
    .slice(start)
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
}

export class AnthropicLlmProvider implements LlmProvider {
  readonly id = PROVIDER;
  private readonly client: Anthropic;

  constructor(opts: AnthropicLlmOptions) {
    this.client =
      opts.client ??
      new Anthropic({ apiKey: opts.apiKey, maxRetries: opts.maxRetries ?? 2, ...(opts.fetch ? { fetch: opts.fetch } : {}) });
  }

  private async content(req: LlmRequest<unknown>): Promise<BetaContentBlockParam[]> {
    const blocks: BetaContentBlockParam[] = [];
    for (const image of req.images ?? []) {
      if (image.kind === "url" && /^https?:/i.test(image.url)) {
        blocks.push({ type: "image", source: { type: "url", url: image.url } });
        continue;
      }
      const bin = await mediaInputToBytes(image);
      if (!IMAGE_TYPES.has(bin.mimeType)) {
        throw new ProviderError(`anthropic: unsupported image type ${bin.mimeType}`, { kind: "fatal", provider: PROVIDER });
      }
      blocks.push({
        type: "image",
        source: { type: "base64", media_type: bin.mimeType as "image/png", data: bytesToBase64(bin.data) },
      });
    }
    blocks.push({ type: "text", text: req.prompt });
    return blocks;
  }

  async generateObject<T>(req: LlmRequest<T>): Promise<LlmResult<T>> {
    const model = req.model.model;
    const options = req.model.options ?? {};
    const useFallback = FALLBACK_MODELS.has(model) && options.fallbacks !== false;
    const effort = effortOf(options);

    const params: BetaMessageStreamParams = {
      model,
      max_tokens: req.maxOutputTokens ?? 64_000,
      system: req.system,
      thinking: { type: "adaptive" },
      output_config: {
        ...(effort ? { effort } : {}),
        format: { type: "json_schema", schema: outputSchemaFor(req.schema) },
      },
      messages: [{ role: "user", content: await this.content(req as LlmRequest<unknown>) }],
      ...(useFallback ? { betas: [FALLBACK_BETA], fallbacks: "default" as const } : {}),
    };

    let message: BetaMessage;
    try {
      // Streaming keeps long structured outputs (shot lists, adaptive thinking) clear of HTTP timeouts.
      message = await this.client.beta.messages.stream(params).finalMessage();
    } catch (err) {
      throw toProviderError(PROVIDER, err, { operation: `${req.schemaName} (${model})` });
    }

    const usage = anthropicUsage(message, model);
    if (message.stop_reason === "refusal") {
      const category = message.stop_details?.category ?? "unspecified";
      throw new ProviderError(`anthropic declined ${req.schemaName} (refusal category: ${category})`, {
        kind: "blocked",
        provider: PROVIDER,
        usage,
      });
    }
    if (message.stop_reason === "max_tokens") {
      throw new ProviderError(
        `anthropic ${req.schemaName} output hit max_tokens (${params.max_tokens}); raise maxOutputTokens`,
        { kind: "fatal", provider: PROVIDER, usage },
      );
    }

    const text = finalText(message);
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch (err) {
      throw new ProviderError(`anthropic ${req.schemaName} returned invalid JSON: ${text.slice(0, 200)}`, {
        kind: "retryable",
        provider: PROVIDER,
        usage,
        cause: err,
      });
    }
    const parsed = req.schema.safeParse(raw);
    if (!parsed.success) {
      // Constraints JSON-schema mode cannot enforce (min/max, patterns) can still be violated; a re-run usually fixes it.
      const issues = parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`);
      throw new ProviderError(`anthropic ${req.schemaName} failed schema validation: ${issues.join("; ")}`, {
        kind: "retryable",
        provider: PROVIDER,
        usage,
      });
    }
    return { object: parsed.data, usage };
  }
}
