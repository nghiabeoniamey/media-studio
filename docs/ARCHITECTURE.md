# Architecture

Developer-facing contract between packages. The product decisions behind it are in [DECISIONS.md](./DECISIONS.md) (Vietnamese).

## Layout

```
apps/
  web/        Next.js 16 dashboard: auth, niche config, story intake, review gates, A/B compare, costs, exports
  worker/     Node process: DBOS durable workflows (production pipeline), Telegram bot, scheduler
packages/
  core/       Zod schemas, provider interfaces, pricing, budget/hero allocation, prompt builders, timing,
              schedule math, status machine, LLM/workflow/render contracts. Pure TS, no I/O.
  db/         Drizzle schema + migrations, auth helpers (scrypt, session tokens), shared queries, seed
  storage/    Local filesystem or S3/R2 object storage
  providers/  Adapters behind core's provider interfaces (anthropic, google, minimax, xai, fal, elevenlabs, mock)
  render/     Remotion composition + renderer, ffmpeg/ffprobe helpers, word alignment
  bible/      Public-domain Bible corpora (BSB, KJV, DRC, CPDV) and reference lookup
```

Internal packages export TypeScript source (`"exports": { ".": "./src/index.ts" }`); the web app transpiles them, the worker runs on `tsx`. Relative imports are extensionless.

## Production pipeline (`produceVideo` workflow)

Each numbered item is a DBOS step (idempotent, retried on `ProviderError.kind === "retryable"`).

1. **Load** video, story, niche, series; resolve providers (niche → series → video overrides).
2. **Research** → `StoryBrief` (LLM, grounded with verses from `@media-studio/bible`). Upsert new characters/locations into the niche library.
3. **Script** → `Script` (LLM). Target words = duration × 2.5 wps.
4. **Shot list** → `ShotList` (LLM) → `validateShotList` (retry once with issues fed back) → `allocateHeroShots` (strategy budget).
5. **Script gate**: unless auto-approved, notify (web + Telegram) and `DBOS.recv(TOPICS.review)`. `changes_requested` → back to 3 with notes; `rejected` → stop.
6. **Budget check**: `estimateVideoCost` vs `spentThisMonth` + `monthlyBudgetUsd`. Over budget → `failed` with a clear message.
7. **Narration**: TTS with the series voice → word timings (vendor, whisper.cpp, or estimate) → `fitShotsToNarration` sets each shot's start/duration.
8. **Character sheets**: for characters in the shot list without a ready sheet, run `ensureCharacterSheet` (6 views via the character-sheet model).
9. **Location refs**: establishing image per location without a reference.
10. **Keyframes** in shot order (continuity needs earlier keyframes): `selectKeyframeReferences` + `buildKeyframePrompt`. Optional `KeyframeQa`.
11. **Hero clips** on the `clips` queue (concurrency-limited): image-to-video from the keyframe (`continueFrom` → last frame of the earlier clip), `buildMotionPrompt`, poll with durable sleep, try fallbacks; `blocked`/exhausted → Ken Burns still (`fallback_still`).
12. **Music**: pick the least-used track from the niche library (generate one if empty).
13. **Render** branded + clean via `@media-studio/render`, thumbnail.
14. **Final gate**: approve / `regenerate_shots` (re-run 10–13 for those shots) / reject.
15. **Schedule + export**: book the next free slots (`nextFreeSlot`) → `publish_jobs` (`pending_manual` in MVP) and a zip with both renders, per-platform captions and the thumbnail.

Every provider call books its `Usage[]` with `recordUsage(..., idempotencyKey)`. Status changes go through `transitionVideo`.

## Contracts

- Provider interfaces: `packages/core/src/providers.ts`. Errors: `ProviderError` with `kind` retryable | blocked | fatal | config.
- LLM: schema names and `<context>` JSON block per call: `packages/core/src/contracts.ts`.
- Worker ↔ web: `WorkflowGateway` (implemented in `apps/web/src/server/gateway.ts` with `DBOSClient`), workflow/queue/topic names, `ReviewMessage`. The workflow records the review row when it receives the message.
- Worker → render: `RenderInput`.
- Pricing: `packages/core/src/pricing.ts` (verified 2026-10-09).

## Local development

```bash
cp .env.example .env            # fill API keys or keep mocks
pnpm install
pnpm db:migrate && pnpm db:seed -- --mock
ADMIN_PASSWORD='...' pnpm --filter @media-studio/db create-admin you@example.com "You"
pnpm dev:worker & pnpm dev:web
```

Tests: `pnpm test` (set `DATABASE_URL_TEST` to run DB integration tests).
