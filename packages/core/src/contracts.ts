import { z } from "zod";
import { ProductionStrategy, ReviewChannel, ReviewDecision, ReviewGate } from "./enums";
import { BrandKit, CaptionPreset } from "./niche";
import type { KenBurnsPlan } from "./prompts";
import { Script } from "./script";
import { StoryBrief, StoryInput } from "./story";

// =====================================================================
// LLM contracts
//
// Every structured LLM call names one of these schemas and ends its prompt
// with a machine-readable context block:
//
//   <context>
//   { ...JSON matching the *Context type below... }
//   </context>
//
// Real models read it like any other prompt text; the mock LLM parses it to
// return deterministic, schema-valid output that references the real inputs.
// =====================================================================

export const LLM_SCHEMAS = {
  storyBrief: "StoryBrief",
  script: "Script",
  shotList: "ShotList",
  keyframeQa: "KeyframeQa",
  policyCheck: "PolicyCheck",
} as const;
export type LlmSchemaName = (typeof LLM_SCHEMAS)[keyof typeof LLM_SCHEMAS];

export interface StoryBriefContext {
  input: StoryInput;
  seriesFormat: string;
  translation: string;
  existingCharacters: { id: string; name: string; aliases: string[] }[];
  existingLocations: { id: string; name: string }[];
  /** Verses looked up from the local public-domain Bible for grounding. */
  scripture: { ref: string; text: string }[];
  contentRules: string[];
}

export interface ScriptContext {
  brief: StoryBrief;
  seriesFormat: string;
  translation: string;
  targetDurationSec: number;
  targetWords: number;
  ctaText: string | null;
  contentRules: string[];
  /** Reviewer feedback when regenerating after "changes_requested". */
  revisionNotes: string | null;
  previousScript: Script | null;
}

export interface ShotListContext {
  brief: StoryBrief;
  script: Script;
  targetDurationSec: number;
  strategy: ProductionStrategy;
  characterNames: string[];
  locationNames: string[];
}

export const KeyframeQa = z.object({
  pass: z.boolean(),
  issues: z.array(z.string()),
});
export type KeyframeQa = z.infer<typeof KeyframeQa>;

export interface KeyframeQaContext {
  shotIndex: number;
  expected: string;
  characterNames: string[];
}

export const PolicyCheck = z.object({
  safe: z.boolean(),
  /** Rewritten prompt that keeps the story beat but avoids the flagged content. */
  saferPrompt: z.string().nullable(),
  reasons: z.array(z.string()),
});
export type PolicyCheck = z.infer<typeof PolicyCheck>;

export interface PolicyCheckContext {
  prompt: string;
  sensitiveFlags: string[];
}

export function contextBlock(context: unknown): string {
  return `<context>\n${JSON.stringify(context, null, 2)}\n</context>`;
}

export function parseContextBlock<T>(prompt: string): T | null {
  const match = /<context>\s*([\s\S]*?)\s*<\/context>\s*$/.exec(prompt.trim());
  if (!match) return null;
  try {
    return JSON.parse(match[1]!) as T;
  } catch {
    return null;
  }
}

// =====================================================================
// Workflow contracts (worker <-> web)
// =====================================================================

export const WORKFLOWS = {
  produceVideo: "produceVideo",
  ensureCharacterSheet: "ensureCharacterSheet",
  buildMusicLibrary: "buildMusicLibrary",
} as const;

export const QUEUES = {
  production: "production",
  clips: "clips",
  library: "library",
} as const;

export const TOPICS = {
  review: "review",
} as const;

export const ReviewMessage = z.object({
  gate: ReviewGate,
  decision: ReviewDecision,
  notes: z.string().default(""),
  shotIndexes: z.array(z.number().int().min(0)).default([]),
  reviewerId: z.string().uuid().nullable(),
  channel: ReviewChannel,
  /** Script edited by the reviewer at the script gate (replaces the AI version when approving). */
  editedScript: Script.nullable().default(null),
});
export type ReviewMessage = z.infer<typeof ReviewMessage>;

/**
 * Implemented in apps/web (`src/server/gateway.ts`) with DBOSClient against the names above:
 *   client.enqueue({ workflowName: WORKFLOWS.produceVideo, queueName: QUEUES.production,
 *                    workflowID: productionWorkflowId(videoId) }, videoId)
 *   client.send(workflowId, message, TOPICS.review)
 * apps/worker registers its workflows and queues under exactly these names.
 */
export interface WorkflowGateway {
  /** Enqueue production for a video row; returns the workflow id (deterministic per video). */
  startProduction(videoId: string): Promise<string>;
  /** Deliver a review decision to a waiting production workflow. */
  sendReview(workflowId: string, message: ReviewMessage): Promise<void>;
  startCharacterSheet(characterId: string): Promise<string>;
  startMusicLibrary(nicheId: string, tracks: number): Promise<string>;
  cancel(workflowId: string): Promise<void>;
  close(): Promise<void>;
}

export function productionWorkflowId(videoId: string): string {
  return `produce-${videoId}`;
}

// =====================================================================
// Render contract (worker -> @media-studio/render)
// =====================================================================

export interface RenderShot {
  index: number;
  startSec: number;
  durationSec: number;
  kind: "clip" | "still";
  /** Absolute local file path (png/jpg for stills, mp4 for clips). */
  src: string;
  /** Applied to stills; ignored for clips. */
  kenBurns: KenBurnsPlan;
  /** Real length of the clip file; render slows/holds or trims to fit `durationSec`. */
  clipDurationSec: number | null;
}

export interface RenderInput {
  width: number;
  height: number;
  fps: number;
  totalDurationSec: number;
  shots: RenderShot[];
  narration: { src: string; durationSec: number; startSec: number };
  music: { src: string; durationSec: number; volume: number } | null;
  captions: { words: { word: string; startSec: number; endSec: number }[]; preset: CaptionPreset } | null;
  verse: { text: string; ref: string; startSec: number; durationSec: number } | null;
  /** null renders the clean version (no logo, CTA, intro or outro). */
  brand: (BrandKit & { logoSrc: string | null }) | null;
}

export const RENDER_DEFAULTS = { width: 1080, height: 1920, fps: 30 } as const;
