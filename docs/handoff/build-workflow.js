export const meta = {
  name: 'media-studio-build',
  description: 'Implement providers, render, bible, worker and web packages in parallel worktrees against the committed core contracts',
  phases: [
    { title: 'Build', detail: '5 implementers in isolated git worktrees, each with tests and a commit' },
  ],
}

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    branch: { type: 'string', description: 'git branch name of your worktree (git rev-parse --abbrev-ref HEAD)' },
    commit: { type: 'string', description: 'full SHA of your final commit' },
    worktreePath: { type: 'string' },
    summary: { type: 'string', description: 'what you built, key design choices' },
    publicApi: { type: 'string', description: 'exact exported functions/types other packages use' },
    tests: { type: 'string', description: 'commands run and their pass/fail counts, verbatim summary lines' },
    unverified: { type: 'array', items: { type: 'string' }, description: 'anything not verified against a live service or not tested, and why' },
    contractChangeRequests: { type: 'array', items: { type: 'string' }, description: 'changes you need in packages/core, packages/db or packages/storage (you must NOT edit them yourself)' },
    newDependencies: { type: 'array', items: { type: 'string' } },
  },
  required: ['branch', 'commit', 'summary', 'publicApi', 'tests', 'unverified', 'contractChangeRequests', 'newDependencies'],
}

const COMMON = `
You are one of five engineers building "Media Studio" in parallel, an automated AI short-video studio (faceless Bible-story reels first; later other niches). You work in your OWN git worktree (your current working directory) branched from commit c46b00b. Other engineers build the other packages at the same time in other worktrees.

READ FIRST (in your worktree): docs/ARCHITECTURE.md, docs/DECISIONS.md (Vietnamese; product decisions), and ALL of packages/core/src/*.ts, packages/db/src/schema.ts, packages/db/src/queries.ts, packages/storage/src/index.ts. These are the binding contracts.

HARD RULES
- Only create/modify files inside your assigned directory (given below). Do NOT edit packages/core, packages/db, packages/storage, root package.json, pnpm-workspace.yaml, tsconfig.base.json, or other engineers' directories. If you need a contract change, implement a local workaround inside your package and list the request in contractChangeRequests.
- Dependencies: add them only to YOUR package's package.json, then run \`pnpm install\` from the worktree root (this updates pnpm-lock.yaml; that is fine — the lead merges lockfiles). Pin exact-ish caret versions that you verified exist with \`npm view <pkg> version\`. TypeScript must stay "~6.0.3" (TS 7 is not used).
- Match the style of packages/core: strict TypeScript, Zod 4, ESM, extensionless relative imports, internal packages export TS source via "exports": {".": "./src/index.ts"}, scripts "typecheck": "tsc -p tsconfig.json" and "test": "vitest run". Comments only where they explain non-obvious intent.
- Tests are mandatory (vitest). Run \`pnpm --filter <your package> typecheck\` and \`pnpm --filter <your package> test\` until both pass. Never skip or weaken a test to get green; if something cannot be tested here (no network to a vendor), test it with mocked fetch/SDK and list it under "unverified".
- Environment: Node 22, pnpm 10, ffmpeg/ffprobe at /usr/bin (drawtext + zoompan available), fonts Inter + DejaVu installed, Chromium headless shell at /opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell (Chromium 141), Postgres 16 running at localhost:5432 with superuser media/media. Create your OWN databases for tests (prefix with your package name, e.g. ms_worker_app, ms_worker_dbos) — never touch media_studio or media_studio_test. Outbound internet is restricted: npm registry and raw.githubusercontent.com work; most vendor API hosts and github.com do not; WebFetch often fails with DNS errors, WebSearch works. Do not call real paid APIs.
- Research notes from an earlier verified research pass live in docs/research/ (synthesis + per-area reports with source URLs) and raw fetched vendor docs in (cloud-only scratchpad, not available locally — use docs/research/) (e.g. gemini_pricing.txt, imggen.txt, tts.txt, oai_img.txt, and folders d/ f/ v/ r/ s/ g/ l/ meta/ pages/ with fetched pages). Grep them for API shapes and model ids before guessing.
- When done: \`git add -A && git commit\` in your worktree with a clear message whose last two lines are exactly:
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016LEEFnZmuZMM1DXxP8q6i3
  Do not push, do not open PRs, do not include any AI model identifier elsewhere in commit messages. Then return the report (branch, full commit SHA, worktree path, etc.).

AGREED CROSS-PACKAGE APIS (implement yours exactly; code against the others exactly — they will exist after merge):
@media-studio/providers:
  export function createProviderRegistry(opts?: { env?: Record<string, string | undefined>; fetch?: typeof fetch }): ProviderCatalogRegistry
  export interface ProviderCatalogRegistry extends ProviderRegistry /* from core */ { catalog(): ProviderCatalogEntry[] }
  export interface ProviderCatalogEntry { kind: "llm" | "image" | "video" | "tts" | "music"; provider: string; model: string; label: string; configured: boolean; notes: string }
  export function mediaInputToBytes(input: MediaInput, fetchImpl?: typeof fetch): Promise<BinaryData>
  Provider id "mock" implements every kind offline at $0 and is always registered.
@media-studio/render:
  export function renderVideo(input: RenderInput /* core */, opts: { outputPath: string; browserExecutable?: string | null; concurrency?: number; onProgress?: (fraction: number) => void }): Promise<{ outputPath: string; durationSec: number; bytes: number }>
  export function probeMedia(path: string): Promise<{ durationSec: number; width: number | null; height: number | null; hasVideo: boolean; hasAudio: boolean }>
  export function extractFrame(videoPath: string, at: number | "last", outPath: string): Promise<void>   // PNG
  export function makeThumbnail(input: { imagePath: string; outPath: string; title?: string }): Promise<void>   // 1080x1920 JPEG
  export function alignWords(audioPath: string, text: string, opts?: { whisperDir?: string | null; model?: string }): Promise<{ words: WordTiming[]; method: "whisper" | "estimate" }>
@media-studio/bible:
  export function listTranslations(): { code: string; name: string; canon: "protestant" | "catholic"; license: string; available: boolean }[]
  export function getPassage(translation: string, reference: string): Promise<{ reference: string; text: string; verses: { book: string; chapter: number; verse: number; text: string }[] } | null>
  export function suggestPassages(topic: string, limit?: number): string[]   // curated story index, e.g. "David and Goliath" -> ["1 Samuel 17:1-54"]
  export function parseReference(input: string): { book: string; chapter: number; verseStart: number | null; verseEnd: number | null } | null
Worker <-> web: see WORKFLOWS / QUEUES / TOPICS / ReviewMessage / productionWorkflowId / WorkflowGateway in packages/core/src/contracts.ts. DBOS SDK is @dbos-inc/dbos-sdk@5.2.11 (read its .d.ts in node_modules: DBOS.registerWorkflow(fn, { name }), DBOS.runStep, DBOS.recv/send, DBOS.sleep, new WorkflowQueue(name, opts), DBOSClient.create({ systemDatabaseUrl, applicationName }), client.enqueue({ queueName, workflowName, workflowID }, ...args), client.send(workflowId, message, topic)). Application name for both sides: "media-studio".
`

const TASKS = [
  {
    key: 'providers',
    dir: 'packages/providers',
    prompt: `${COMMON}
YOUR ASSIGNMENT: packages/providers (@media-studio/providers). Implement the provider adapters behind the interfaces in packages/core/src/providers.ts.

1) Registry: createProviderRegistry({ env, fetch }) registers real providers only when their key is present (ANTHROPIC_API_KEY, GEMINI_API_KEY, MINIMAX_API_KEY + MINIMAX_API_BASE, XAI_API_KEY, FAL_KEY, ELEVENLABS_API_KEY), always registers "mock". Unknown/unconfigured ids throw ProviderError kind "config". catalog() lists every model the registry knows (configured or not) with a human label, for UI dropdowns. Map every vendor error to ProviderError kinds: 429/5xx/timeouts/overloaded -> retryable; content-policy refusals -> blocked (keep any billed usage); 400/422 -> fatal; 401/403 -> config. Every successful call returns Usage[] priced with the core pricing helpers (llmCost, imageCost, videoCost, ttsCost, musicCost); prefer vendor-reported units (tokens, seconds) when available.

2) Real adapters (verify request/response shapes from the research files and vendor docs you can reach; mark anything unverified):
 - anthropic LLM via @anthropic-ai/sdk (current major). BEFORE writing it, invoke the Skill tool with skill "claude-api" and read its typescript files for structured outputs (output_config.format / messages.parse with a JSON schema), adaptive thinking, effort (ModelRef.options.effort), streaming for large outputs, refusal stop_reason handling and the server-side fallbacks guidance for claude-opus-5-5 / claude-sonnet-5-5. Convert the Zod schema with z.toJSONSchema. Validate the returned object with req.schema.parse. Images (MediaInput) go in as image blocks. Default models come from the ModelRef; never hardcode.
 - google via @google/genai: image generation for "gemini-nano-banana-2.1" and "gemini-3-pro-image" (reference images as inline parts each preceded by its label text, aspect ratio 9:16 via image config); TTS "gemini-3.8-flash-tts" (prebuilt voice name from VoiceConfig.voiceId, style direction prepended; output is raw PCM — wrap into a proper WAV header; compute durationSec; words: null); music "lyria-3.5" (instrumental; if the exact API cannot be confirmed, implement against the most likely documented shape and mark unverified); video "gemini-omni-1.1-flash" image-to-video as a long-running operation (submit returns operation name as jobId; poll returns state; download video bytes; billed seconds).
 - minimax video: MiniMax-H3-Max / MiniMax-H3 image-to-video (first frame, optional last frame, prompt, duration, resolution 480p/768p), create task -> query status -> retrieve file download URL. Use MINIMAX_API_BASE.
 - xai video: grok-imagine-video-1.5 and grok-imagine-video-1.5-lite image-to-video (async request + poll). Note xAI bills policy-violating generations.
 - fal video via @fal-ai/client queue API: "fal-ai/kling-video/v3/standard/image-to-video" and "fal-ai/kling-video/o3/standard/reference-to-video".
 - elevenlabs TTS with timestamps (character alignment -> word timings), model "eleven_v4".
 VideoProvider.capabilities(model) must be accurate per model (durations, last-frame support, max reference images, resolutions, native audio). Always request audio OFF for hero clips unless req.withAudio.

3) Mock provider "mock" (models mock-llm, mock-image, mock-video, mock-tts, mock-music), fully offline, deterministic, producing REAL media with ffmpeg via child_process (no shell string interpolation of untrusted text; pass args arrays):
 - mock-llm: dispatch on req.schemaName using parseContextBlock from core (LLM_SCHEMAS / *Context types in packages/core/src/contracts.ts). Build plausible, schema-valid objects that USE the context: StoryBrief (title from topic/text, characters from existingCharacters plus at most one new one, 1–2 locations, scripture refs from context, a sensitive flag when the topic mentions a child/baby/crucifixion), Script (beats b1..bN with purposes hook→context→rising→turning_point→resolution→reflection→cta, total words within ±15% of targetWords, platformMeta within the length/hashtag limits, onScreenVerse from brief scripture if any), ShotList (1–2 shots per beat, only characterNames/locationNames from context, valid camera enums with varied sizes/movements, durations summing to targetDurationSec ±10%, at least 2 shots kind "hero", one matchSetupOf link to an earlier shot, continueFrom null) — it must pass validateShotList. KeyframeQa -> pass; PolicyCheck -> safe unless the prompt contains "crucif" or "blood" (then provide a saferPrompt). Always finish with req.schema.parse(object).
 - mock-image: PNG sized by aspect ratio (9:16 -> 768x1376), deterministic color gradient from a hash of the prompt with a short label drawn via drawtext (fall back to no text if drawtext fails); include the number of reference images in the label.
 - mock-video: submit stores a job in memory; first poll -> running, next poll -> succeeded with an MP4 (H.264, yuv420p, 24 fps, 720x1280 or matching resolution) made from the first frame with a zoompan push-in for durationSec; if the prompt contains "[blocked]" return status blocked.
 - mock-tts: WAV 24 kHz mono, duration = words / (2.5 × speakingRate) seconds (quiet tone is fine), words = estimateWordTimings(text, duration).
 - mock-music: WAV of requested duration (soft chord).
 Usage for mock is $0 with sensible units.

4) Tests: adapter unit tests with injected fetch / mocked SDK clients covering request building, polling state mapping, error classification and usage pricing; mock providers tested end-to-end (ffprobe the outputs; mock LLM outputs parse and pass validateShotList for a realistic context). Export everything listed in the AGREED APIS.`,
  },
  {
    key: 'render',
    dir: 'packages/render',
    prompt: `${COMMON}
YOUR ASSIGNMENT: packages/render (@media-studio/render) — the video compositor. This is the heart of the "hybrid motion comic" strategy, so quality matters: it must not look like a slideshow.

Use Remotion 4.0.534 (remotion, @remotion/bundler, @remotion/renderer, @remotion/captions, @remotion/install-whisper-cpp; keep all @remotion/* versions identical) with React 19.
1) Composition "StoryVideo" (1080x1920, 30 fps, duration from RenderInput.totalDurationSec) rendering RenderInput from packages/core/src/contracts.ts:
 - Shots on a timeline at startSec/durationSec. Stills: Ken Burns using the RenderShot.kenBurns plan (scale/translate interpolated with an ease curve), plus a subtle parallax/depth feel (e.g. slight blur-scaled background layer behind a sharper foreground crop, or gentle vignette + film grain) — keep it tasteful. Clips: OffthreadVideo; if clipDurationSec < durationSec slow down to at most 0.8× then hold the last frame; if longer, trim. Short crossfades (~0.3 s) between shots.
 - Audio: narration at its startSec; music looped/trimmed to the full duration at RenderInput.music.volume with fade in/out and ducking under narration.
 - Captions per CaptionPreset.style: "word_pop" (one or few big words popping), "karaoke_highlight" (page of up to maxWordsPerPage words, current word highlighted), "cinematic_subtitle" (sentence-ish lines at the bottom, no highlight), "minimal". Use @remotion/captions createTikTokStyleCaptions for paging. Respect fontFamily/fontSizePx/colors/stroke/position/uppercase. Keep captions inside 9:16 safe areas (avoid top 10% and bottom 18% UI zones on TikTok/Reels).
 - Verse overlay card (text + reference) when RenderInput.verse is set.
 - Brand (when brand != null): logo watermark (logoSrc) at watermarkPosition/opacity; CTA lower-third in the last ~3 s; intro title card and outro card when enabled. When brand == null (clean export) none of these appear.
 - Fonts: do NOT fetch Google Fonts at render time (no network). Use locally installed Inter/DejaVu via CSS font-family, or bundle font files from /usr/share/fonts into the package if needed.
2) Rendering: renderVideo(input, opts) bundles once (cache the bundle per process), serves the referenced local files over a private 127.0.0.1 HTTP server for the duration of the render (only the files listed in the input, mapped to random URL paths; supports Range requests), calls selectComposition + renderMedia (h264, yuv420p, AAC audio, crf ~20), browserExecutable from opts or env REMOTION_BROWSER_EXECUTABLE (in this sandbox: /opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell — Remotion cannot download its own browser here), reports progress, returns duration/bytes (verify with ffprobe).
3) ffmpeg/ffprobe helpers: probeMedia, extractFrame (number seconds or "last"), makeThumbnail (1080x1920 JPEG from an image with an optional title drawn), plus internal helpers you need. Use execFile with argument arrays only.
4) alignWords(audioPath, text, opts): if whisper.cpp is installed at opts.whisperDir (env WHISPER_CPP_DIR) use @remotion/install-whisper-cpp transcribe with tokenLevelTimestamps on a 16 kHz mono WAV (convert with ffmpeg), map tokens back onto the ORIGINAL script words (the captions must show the script text, not the ASR spelling) via a monotonic alignment; otherwise fall back to estimateWordTimings from core using the probed audio duration. Provide a script "install-whisper" (tsx) that installs whisper.cpp + model into WHISPER_CPP_DIR (it will not work in this sandbox because github.com is blocked — that is expected; make it fail with a clear message). Test the fallback path and the token→script-word mapping with synthetic token data.
5) A "preview" script (tsx) that generates fixture assets with ffmpeg (a few gradient stills, one short clip, a sine narration WAV, a music WAV), builds a RenderInput (use kenBurnsFor from core), and renders data/preview-branded.mp4 and data/preview-clean.mp4.
6) Tests: unit tests for timing math (clip fit, caption paging, safe-area layout helpers) and an integration test that renders a ~6 s video (3 stills + 1 clip, captions, verse, brand) in branded and clean modes with the sandbox browser, asserting via probeMedia 1080x1920, ~6 s, has audio; keep total test time reasonable (use low concurrency settings that work on 4 CPUs). Also verify visually by extracting 2–3 frames with extractFrame and viewing them with the Read tool (it can show PNG images) — fix anything that looks broken (black frames, captions off-screen, missing images).`,
  },
  {
    key: 'bible',
    dir: 'packages/bible',
    prompt: `${COMMON}
YOUR ASSIGNMENT: packages/bible (@media-studio/bible) — public-domain scripture for grounding scripts and on-screen verses.

Sources (public domain, reachable here): https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/{BSB,KJV,DRC,CPDV}.json (format: { translation, books: [{ name, chapters: [{ chapter, verses: [{ verse, text }] }] }] }). BSB = Berean Standard Bible (protestant canon, modern English, default for general series), KJV, DRC = Douay-Rheims Challoner (catholic canon incl. Tobit, Judith, Wisdom, Sirach, Baruch, 1–2 Maccabees; Vulgate-style names/numbering — check how this dataset names books like "1 Kings"/"1 Samuel", "Paralipomenon"/"Chronicles", and Psalm numbering), CPDV = Catholic Public Domain Version.
1) scripts/fetch.ts (pnpm script "fetch"): download each translation, normalize to a compact JSON (book list with canonical English book ids, chapters as arrays of verse strings), strip Strong's/markup if any, write to packages/bible/data/<CODE>.json (gitignored; see root .gitignore), and write/verify data/manifest.json with sha256 per file. Data dir overridable by env BIBLE_DATA_DIR. Run it here so tests can also exercise real data when present.
2) Reference parsing: parseReference handles "Exodus 17:1-7", "Ex 17:1–7" (en dash), "1 Samuel 17", "1 Sam 17:45", "Psalm 23", "Ps 23:1-4", "John 3:16", "Song of Songs 2:1", "Sirach 3:1-6", "Tobit 12:6", "2 Maccabees 7:1", common abbreviations, roman numerals ("I Samuel"), case-insensitive. Map canonical modern book names onto each translation's naming and verse numbering (DRC/CPDV Psalms: implement the Hebrew→Vulgate psalm-number mapping for the common cases, and the 1–4 Kings / 1–2 Paralipomenon names if the dataset uses them). Unknown books -> null.
3) getPassage(translation, reference) returns the joined text and verse list (lazy-load + cache per translation; clean whitespace). Return null for unknown refs or translations not downloaded. listTranslations() reports availability (data file present).
4) suggestPassages(topic, limit): a curated index (>= 150 entries) of well-known stories, parables, miracles, Marian and saint-related scripture (Annunciation, Visitation, Wedding at Cana, Presentation, Pentecost, etc.), each with keywords and one or more references (modern naming). Score by keyword overlap with simple normalization (lowercase, strip punctuation, basic plural stemming). Example: "david and goliath" -> ["1 Samuel 17:1-54"], "prodigal son" -> ["Luke 15:11-32"], "Moses strikes the rock" -> ["Exodus 17:1-7", "Numbers 20:1-13"].
5) Tests: parser cases above, Psalm/Kings mapping for DRC, curated index lookups, getPassage against a small committed fixture (data/fixtures/*.json with a handful of chapters in the normalized format) AND, when the real data files exist, a few real lookups (skip if missing). Make the public API exactly the AGREED one.`,
  },
  {
    key: 'worker',
    dir: 'apps/worker',
    prompt: `${COMMON}
YOUR ASSIGNMENT: apps/worker (@media-studio/worker) — the durable production pipeline, Telegram bot and publishing scheduler. Read docs/ARCHITECTURE.md "Production pipeline" carefully; implement it faithfully.

Packages @media-studio/providers, @media-studio/render and @media-studio/bible do NOT exist in your worktree yet (built in parallel). Design for dependency injection:
  interface PipelineDeps { db: Database; storage: Storage; providers: ProviderRegistry; render: RenderService; bible: BibleService; notifier: Notifier; now(): Date; config: WorkerConfig }
  RenderService / BibleService are local interfaces mirroring the AGREED APIS (same names/signatures) so that src/main.ts can later wire the real packages with zero changes: in src/main.ts import { createProviderRegistry } from "@media-studio/providers", { renderVideo, probeMedia, extractFrame, makeThumbnail, alignWords } from "@media-studio/render", { getPassage, suggestPassages } from "@media-studio/bible" and add those three as "workspace:*" dependencies in package.json even though they don't resolve yet (exclude src/main.ts from your tsconfig "include" via a separate tsconfig.main.json if needed so typecheck passes now; the lead will re-include it after merge). Everything else must typecheck and be tested with fakes.

Implement:
1) DBOS setup (@dbos-inc/dbos-sdk 5.2.11): DBOS.setConfig({ name: "media-studio", systemDatabaseUrl: DBOS_SYSTEM_DATABASE_URL }), queues QUEUES.production (worker concurrency PRODUCTION_CONCURRENCY), QUEUES.clips (CLIP_CONCURRENCY), QUEUES.library; workflows registered with DBOS.registerWorkflow under exactly WORKFLOWS.produceVideo (arg: videoId), WORKFLOWS.ensureCharacterSheet (characterId), WORKFLOWS.buildMusicLibrary (nicheId, tracks). Child workflows (per hero clip) may have their own names.
2) produceVideo: steps 1–15 of ARCHITECTURE.md. Specifics:
 - Resolve settings: niche.settings + series.settings (voice, translation, llm override, captions override, alwaysReviewScript) + video.overrides (video model / llm for A/B).
 - Research prompt includes verses from bible.getPassage for bible.suggestPassages(topic) and any refs found by parseReference-like matching in the input text; write StoryBrief to stories.brief; upsert characters (match by name or alias, case-insensitive; never overwrite existing appearance) and locations.
 - LLM prompts: write strong, specific system prompts (story research; script writing for 9:16 short-form with a 0–2 s hook, original retelling, scripture quoted only from the given translation text, contentRules, CTA gentle; shot planning that teaches the consistency technique: establish location with a wide shot first, shot-reverse-shot with consistent screen direction (180° rule), reuse setups via matchSetupOf, close-ups for emotion, motion only where it matters, 3–6 s shots, keyframePrompt describes visual content only). Every prompt ends with contextBlock(<the matching *Context type>). Validate shot lists with validateShotList; on issues retry once feeding the issues back; then allocateHeroShots with resolveStrategyParams and beat purposes.
 - Persist scripts (versioned) and shots rows; set status via transitionVideo; book every Usage[] with recordUsage using deterministic idempotency keys that include the workflow step and attempt.
 - Script gate: skip if niche.autoApproveScript && !series.alwaysReviewScript; else notifier.scriptReady(...) then DBOS.recv(TOPICS.review) (timeout 14 days) — parse with ReviewMessage, write the reviews row, handle approved (editedScript replaces the AI script → re-plan shots), changes_requested (re-run script with revisionNotes, max 3 rounds), rejected.
 - Budget check with estimateVideoCost + spentThisMonth vs monthlyBudgetUsd → fail with a clear message and notify. Warn at 80%.
 - Narration: TTS (series voice or niche defaultVoice) → store asset → word timings (vendor words, else render.alignWords) → fitShotsToNarration → update shots.startSec/durationSec; total duration = narration + outro.
 - Character sheets via the ensureCharacterSheet workflow (6 CHARACTER_VIEWS, buildCharacterSheetPrompt, uploaded sourceAsset as reference when present, character_views rows, sheetStatus). Location refs: one establishing image per location missing a reference.
 - Keyframes sequentially in shot order with selectKeyframeReferences (max = image provider maxReferences) + buildKeyframePrompt; optional PolicyCheck via llmFast when the brief has sensitive flags (use saferPrompt).
 - Hero clips on QUEUES.clips as child workflows: image-to-video from the keyframe (continueFrom → render.extractFrame(last) of that earlier clip as first frame), buildMotionPrompt, duration = snapDuration(ceil(shot duration), caps), submit then poll with DBOS.sleep backoff (5 s → 30 s, max ~20 min), on blocked/failed try the next fallback model, finally mark fallback_still. Never let one shot fail the whole video.
 - Music: least-used niche track (music_tracks); if none, generate one via the music provider and save it to the library.
 - Render branded (brand from niche + logo asset path) and clean via render.renderVideo with RenderInput built from shots (kenBurnsFor(spec.camera.movement)), captions (series captions override else niche captions), verse from script.onScreenVerse (shown near the end), music volume ~0.15; thumbnail via makeThumbnail from the hook keyframe; store assets; update videos.
 - Final gate (skip if autoApproveFinal): notifier.finalReady with the branded mp4; regenerate_shots re-runs keyframe+clip for those shot indexes then re-renders; approved → schedule; rejected → stop.
 - Schedule + export: for each platform in the niche's slots, nextFreeSlot (taken = existing publish_jobs.scheduledAt for the niche) → publish_jobs rows (status pending_manual, aiDisclosure true); export zip (both mp4s, thumbnail, per-platform caption .txt files with title/description/hashtags, a README.txt telling the human to enable the AI-content label on each platform) stored as an asset; transition approved → scheduled.
3) Notifier interface + Telegram implementation with grammY (long polling in the worker process when TELEGRAM_BOT_TOKEN is set; no-op notifier otherwise): /start <code> links a chat (telegram_links.linkCode, unexpired) to a user; notifications to linked users who are admins or members of the niche: script ready (title, hook, beat summary, cost estimate, buttons Approve / Reject + link to APP_BASE_URL/videos/<id>), final ready (send the mp4 if ≤ 50 MB else a link; buttons Approve / Reject / "Regenerate shots" → link to web), failures, budget warnings, and publish reminders. Callback data must be compact and verified: look up the Telegram user's linked account and its niche access before acting; then DBOS.send(productionWorkflowId(videoId), ReviewMessage{channel:"telegram"}, TOPICS.review). Answer every callback query.
4) A DBOS scheduled workflow every 15 minutes that sends Telegram reminders for publish_jobs due within the next 30 minutes (once per job; with the clean or branded file and the platform caption).
5) src/main.ts: load env (fail fast with clear messages), create db/storage/registry, launch DBOS, start Telegram, graceful shutdown on SIGTERM/SIGINT. package.json scripts: dev (tsx watch src/main.ts), start (tsx src/main.ts), typecheck, test.
6) Tests (vitest, real local Postgres with your own databases; run migrations from packages/db via runMigrations): unit tests for prompt building, settings resolution, export packaging and scheduling; a DBOS integration test that launches DBOS in-process with FAKE providers/render/bible/notifier (fakes produce tiny but real files where render/ffprobe would be needed) and runs produceVideo end-to-end for a seeded mock niche with auto-approve on → status "scheduled", shots/assets/ledger rows present; and a second run with gates on that delivers ReviewMessages using DBOSClient with exactly the web-side call shape (enqueue + send with the contract names), including a regenerate_shots round. Also test that a blocked hero clip ends as fallback_still and the video still completes.`,
  },
  {
    key: 'web',
    dir: 'apps/web',
    prompt: `${COMMON}
YOUR ASSIGNMENT: apps/web (@media-studio/web) — the Next.js dashboard. The user is Vietnamese: ALL UI text in Vietnamese (keep strings in src/i18n/vi.ts), generated content stays English. Mobile-friendly (reviews happen on a phone). Clean, calm design with Tailwind CSS v4.

Stack: Next.js 16 (App Router, React 19, Server Components + Server Actions), Tailwind v4, Zod 4, @media-studio/core, @media-studio/db, @media-studio/storage, @dbos-inc/dbos-sdk (DBOSClient only). Check Next 16 specifics in node_modules/next (e.g. whether middleware is now "proxy.ts", async params/cookies APIs) rather than assuming. transpilePackages for the workspace packages; output "standalone" for Docker. Do NOT depend on @media-studio/providers, render, bible or worker (built in parallel); provider/model dropdown options come from the price tables in packages/core/src/pricing.ts (+ the "mock" models: mock-llm, mock-image, mock-video, mock-tts, mock-music).

Implement:
1) Auth: login page, sessions in the sessions table (newSessionToken / sessionIdFromToken / verifyPassword from @media-studio/db; httpOnly secure (prod) sameSite=lax cookie, 30-day expiry, logout), route protection, roles: admin sees everything + user management; editor sees only niches in niche_members. Rate-limit login attempts per IP/email in memory. Every server action re-checks auth and niche access (never trust hidden form fields).
2) src/server/gateway.ts: WorkflowGateway implemented with DBOSClient.create({ systemDatabaseUrl: DBOS_SYSTEM_DATABASE_URL, applicationName: "media-studio" }) — startProduction: client.enqueue({ workflowName: WORKFLOWS.produceVideo, queueName: QUEUES.production, workflowID: productionWorkflowId(videoId) }, videoId) and store videos.workflowId; sendReview: client.send(workflowId, ReviewMessage.parse(msg), TOPICS.review); startCharacterSheet / startMusicLibrary similarly on QUEUES.library; cancel. Lazy singleton. Unit-test it with a mocked DBOSClient asserting exact call shapes.
3) /media/[...key] route handler: streams storage objects with Range support; allowed if the user is logged in, or if ?exp=&sig= is a valid HMAC-SHA256(APP_SECRET, key+exp) not yet expired (for external fetchers like video APIs and publishers). Helper signMediaUrl(key, ttl). Correct content-type; never allow path traversal (Storage already validates keys).
4) Pages (Vietnamese UI):
 - Dashboard: per niche spend this month vs budget (from cost_ledger), counts by status, "cần duyệt" (videos in script_review / final_review), recent videos.
 - Niche settings: edit NicheSettings with forms (style preset, caption preset incl. style select, brand kit incl. logo upload, provider selection dropdowns per stage, strategy + optional params, target duration, monthly budget, auto-approve toggles, timezone, schedule slots editor, content rules list); validate with NicheSettings.parse; series list/create/edit (SeriesSettings incl. voice and translation BSB/KJV/DRC/CPDV); character library (list with sheet thumbnails, create character with appearance/wardrobe, upload a source image ≤ 10 MB png/jpg/webp — only fictional/AI/illustrated characters, show a notice — then "Tạo character sheet" → gateway.startCharacterSheet, show status); locations list/edit; music library (list + "Tạo nhạc" → startMusicLibrary); platform accounts (manual handles for now).
 - New story (/stories/new): niche, series, input kind (topic / pasted text / reference URL with notes), target duration (default from niche), strategy, optional A/B: pick 2–3 video models → creates one story + N videos sharing variantGroupId with overrides.video.primary; then startProduction for each.
 - Video list with filters (niche, status) and Video detail: status timeline, brief (characters, locations, scripture, sensitive flags), estimated vs actual cost, SCRIPT GATE (render beats + platform meta; buttons Duyệt / Yêu cầu sửa (notes) / Từ chối; inline edit of beat texts producing editedScript), SHOT GRID (keyframe thumbnails, hero/still badge, camera spec, provider, status, cost; checkboxes to select shots for regeneration), FINAL GATE (video player for branded/clean via signed /media URLs, Duyệt / Tạo lại cảnh đã chọn / Từ chối), export download, publish jobs list with "Đánh dấu đã đăng" (+ post URL) for manual posting, and per-platform caption copy buttons.
 - A/B compare (/compare/[groupId]): side-by-side players with model, cost, status; button to approve the winner (sends approve to the winner and reject to the others).
 - Costs: by month, niche, provider/model, operation.
 - Users (admin): create user (email, name, temp password, role), assign niches, deactivate; "Kết nối Telegram": generate an 8-char link code valid 30 minutes (telegram_links row for the current user) and show "/start CODE" instructions.
5) Polling/refresh: video detail auto-refreshes while the workflow runs (simple interval router.refresh in a client component).
6) Tests: vitest unit tests for auth/session helpers, media URL signing/verification and Range parsing, server-action validation and access control (editor cannot touch other niches), gateway call shapes. Then \`pnpm --filter @media-studio/web build\` must succeed. Finally run a smoke test: start Postgres-backed app (\`next start\`) against your own database (run migrations + seedBibleNiche({ mock: true }) + create an admin user with hashPassword), log in with curl or Playwright (Chromium at /opt/pw-browsers/chromium-1194/chrome-linux/chrome), load dashboard, niche settings, new story and a video detail page seeded with a fake script/shots, and take 2–3 screenshots at phone width (390 px) — view them with the Read tool and fix layout problems.`,
  },
]

phase('Build')
const results = await parallel(TASKS.map(t => () =>
  agent(t.prompt, { label: `build:${t.key}`, phase: 'Build', schema: REPORT_SCHEMA, isolation: 'worktree' })
    .then(r => (r ? { key: t.key, dir: t.dir, ...r } : null))
))
return results
