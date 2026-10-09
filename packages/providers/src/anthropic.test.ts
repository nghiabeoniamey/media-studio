import { describe, expect, it } from "vitest";
import { KeyframeQa, PolicyCheck, Script, ShotList, StoryBrief, type ModelRef } from "@media-studio/core";
import { AnthropicLlmProvider, outputSchemaFor } from "./anthropic";

const model: ModelRef = { provider: "anthropic", model: "claude-opus-5-5", options: { effort: "high" } };

function fakeClient(message: Record<string, unknown>, seen: { params?: Record<string, unknown> }) {
  return {
    beta: {
      messages: {
        stream: (params: Record<string, unknown>) => {
          seen.params = params;
          return { finalMessage: async () => message };
        },
      },
    },
  } as never;
}

const usage = { input_tokens: 1000, output_tokens: 500, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };

describe("anthropic adapter", () => {
  it("converts every pipeline schema to a structured-output JSON schema", () => {
    for (const schema of [StoryBrief, Script, ShotList, KeyframeQa, PolicyCheck]) {
      const json = outputSchemaFor(schema);
      expect(json.type ?? json.$ref ?? json.anyOf).toBeTruthy();
      expect(JSON.stringify(json)).not.toContain("$schema");
    }
  });

  it("sends adaptive thinking, effort, schema and refusal fallback, then validates and prices", async () => {
    const seen: { params?: Record<string, unknown> } = {};
    const client = fakeClient(
      { model: "claude-opus-5-5", stop_reason: "end_turn", usage, content: [{ type: "text", text: JSON.stringify({ pass: true, issues: [] }) }] },
      seen,
    );
    const llm = new AnthropicLlmProvider({ apiKey: "x", client });
    const res = await llm.generateObject({ model, system: "s", prompt: "p", schema: KeyframeQa, schemaName: "KeyframeQa" });
    expect(res.object).toEqual({ pass: true, issues: [] });
    const p = seen.params!;
    expect(p.thinking).toEqual({ type: "adaptive" });
    expect((p.output_config as { effort: string }).effort).toBe("high");
    expect(p.fallbacks).toBe("default");
    expect(p.betas).toEqual(["server-side-fallback-2026-07-01"]);
    const total = res.usage.reduce((s, u) => s + u.costUsd, 0);
    expect(total).toBeCloseTo((1000 * 4 + 500 * 20) / 1e6, 6);
  });

  it("maps refusals to blocked and schema violations to retryable", async () => {
    const refusal = new AnthropicLlmProvider({
      apiKey: "x",
      client: fakeClient({ model: "claude-opus-5-5", stop_reason: "refusal", stop_details: { category: "general_harms" }, usage, content: [] }, {}),
    });
    await expect(refusal.generateObject({ model, system: "", prompt: "", schema: KeyframeQa, schemaName: "KeyframeQa" })).rejects.toMatchObject({ kind: "blocked" });
    const invalid = new AnthropicLlmProvider({
      apiKey: "x",
      client: fakeClient({ model: "claude-opus-5-5", stop_reason: "end_turn", usage, content: [{ type: "text", text: '{"pass":"yes"}' }] }, {}),
    });
    await expect(invalid.generateObject({ model, system: "", prompt: "", schema: KeyframeQa, schemaName: "KeyframeQa" })).rejects.toMatchObject({ kind: "retryable" });
  });

  it("does not request fallbacks for Haiku", async () => {
    const seen: { params?: Record<string, unknown> } = {};
    const llm = new AnthropicLlmProvider({
      apiKey: "x",
      client: fakeClient({ model: "claude-haiku-5-5", stop_reason: "end_turn", usage, content: [{ type: "text", text: '{"pass":true,"issues":[]}' }] }, seen),
    });
    await llm.generateObject({ model: { provider: "anthropic", model: "claude-haiku-5-5", options: {} }, system: "", prompt: "", schema: KeyframeQa, schemaName: "KeyframeQa" });
    expect(seen.params!.fallbacks).toBeUndefined();
  });
});
