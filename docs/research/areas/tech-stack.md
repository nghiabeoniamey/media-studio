
# Media Studio: tech stack, architecture, reusable open source and hosting cost (research as of 2026-10-09)

## 0. Summary
- **Pick the language you are fastest in.** The workload is mostly I/O: HTTP calls to AI APIs, polling or webhooks, and waiting on human approvals. The rest is a small amount of CPU-bound FFmpeg or Remotion work, roughly 9 videos a day across 3 niches. Java 25 and Node can both handle this easily. What separates them is the ecosystem:
  - **TypeScript** has Remotion (templated composition and animated captions, free for a solo developer), official fal and Replicate SDKs, and Postiz (TypeScript, open to fork).
  - **Java** has the most mature durable-workflow SDK (Temporal) and Spring AI 2.0 GA.
- **Don't use three languages.** Python only makes sense if you self-host models or ComfyUI, and a budget under $100/month cannot pay for a GPU running 24/7.
- **Architecture:** one modular monolith (UI plus API) and one worker process from the same codebase, with Postgres, Cloudflare R2, and a durable-workflow engine for the pipeline and the approval gates.
- **Make it a web app on a VPS, not a desktop app.** Scheduled publishing and webhooks need a machine that is always on and has a public URL.
- **Hosting should be about $5–15/month.** One 4–6 vCPU / 8–12 GB VPS plus R2, which is close to free at this volume. Hetzner's cheap CX tier has been unavailable since early September 2026, and its CPX prices rose about 2.4–2.7x on 2026-06-15.
- **Publishing is the hidden blocker, not the stack.**
  - TikTok and YouTube keep API uploads private until your API client passes an audit.
  - A self-hosted scheduler such as Postiz therefore needs your own developer apps, which go through weeks of approvals.
  - A hosted posting API (Upload-Post, $33/mo billed annually) avoids that.
- **n8n:** fine for a 1–2 week content-validation prototype. It is not a good backbone for the product.

---
## 1. What the workload actually is (drives every choice)
| Stage | Nature | Duration | Notes |
|---|---|---|---|
| Research, script, shot list (LLM) | HTTP, seconds | 10–60 s | Structured JSON output |
| Character sheet, keyframes (image API) | Async HTTP, queue or poll | 10 s – 2 min each | fal and Replicate are queue-based and support polling or webhooks |
| Video per shot (video API) | Async HTTP | 1–10 min each, 5–15 shots | The most failure-prone step, so it needs per-shot retry and regeneration |
| TTS, music, word timestamps | HTTP | seconds | |
| Assemble (FFmpeg / Remotion) | **CPU-bound locally** | ~0.5–3 min per video (my estimate, not benchmarked) | Remotion needs at least 2 vCPU and 3–4 GB RAM ([short-video-maker requirements](https://github.com/gyoridavid/short-video-maker)) |
| Human review gate (script, final) | Wait for hours or days | | Needs durable pause/resume |
| Scheduled publish | Cron, 24/7 | | Needs an always-on server |

**Volume:**
- 2–3 videos per day per niche, with 1 niche at first and up to ~3 later. That is ~270 videos and a few thousand external calls per month.
- This is tiny. You don't need microservices, Kafka or Kubernetes.

---
## 2. Stack options compared

### (A) Spring Boot 4.x / Java 25 + Next.js
- **Framework status**
  - Spring Boot 4.1.0 GA was released 2026-06-10 ([spring.io](https://spring.io/blog/2026/06/10/spring-boot-4/)).
  - On Java 24+, JEP 491 means `synchronized` no longer pins virtual threads ([JEP 491](https://openjdk.org/jeps/491)). Virtual threads on Java 25 LTS are therefore safe for thousands of blocked HTTP polls.
- **LLM**
  - Spring AI 2.0.0 GA was released 2026-06-12 for Boot 4 / Framework 7, and 2.0.1 followed on 2026-08-21 with CVE fixes ([GA](https://spring.io/blog/2026/06/12/spring-ai-2-0-0-GA-available-now/), [2.0.1](https://spring.io/blog/2026/08/21/spring-ai-2-0-1-available-now/)). **New in the last ~4 months.**
  - 2.0 switched to vendor SDKs for OpenAI, Anthropic and Google GenAI, with a single implementation per provider ([Visual Studio Magazine](https://visualstudiomagazine.com/articles/2026/06/29/spring-ai-2-0-goes-ga-giving-java-developers-a-more-mature-ai-app-stack.aspx)).
- **Media APIs**
  - fal publishes an official Java/Kotlin client: `ai.fal.client:fal-client` 0.7.1 (JVM, Java 11+), plus a `fal-client-async` artifact ([fal docs](https://fal.ai/docs/api-reference/client-libraries/kotlin)).
  - Replicate has **no official Java client**. Its official libraries are Node, Python, Swift, Go and an MCP client, so from Java you would use plain REST or OpenAPI codegen ([Replicate client libraries](https://replicate.com/docs/reference/client-libraries.md)).
- **FFmpeg from Java**
  - **Recommended: ProcessBuilder plus your own small typed command builder.**
  - Jaffree's maintenance status is unclear: last release 2024-08-29 per [developers.italia.it](https://developers.italia.it/en/software/github.com/kokorin/jaffree.html), and an aggregator reports a push in March 2026.
  - JavaCV is in-process native, which is too heavy for this use.
  - Animated captions would be ASS/libass karaoke subtitles burned in by FFmpeg. That works, but it is less flexible than Remotion.
- **Job orchestration**
  - **Temporal Java SDK.** The Spring Boot starter `io.temporal:temporal-spring-boot-starter` 1.31.0 is GA and supports Boot 2.x, 3.x and 4.x ([Temporal docs](https://docs.temporal.io/develop/java/integrations/spring-boot-integration)). The model fits well:
    - Signals for approve, reject or regenerate.
    - Schedules for publishing.
    - Activity retries and heartbeats.
    - Async activity completion for webhooks.
    - Cost: Temporal Cloud is pay-as-you-go at "$50 per million actions, no base monthly fee", with $150 of free credit for 90 days ([temporal.io/pricing](https://temporal.io/pricing)). My estimate is ~50–100 actions per video × 270 videos ≈ 15–30k actions/month, about **$1–2/month**. Verify the no-minimum terms before relying on it.
    - Self-hosting is the alternative: one container plus Postgres needs ~2 GB / 2 vCPU without Elasticsearch, according to third-party guides ([RamNode](https://ramnode.com/guides/temporal)), so treat that as low confidence.
  - **DBOS Transact Java.**
    - MIT licensed, durable workflows stored only in Postgres, with no extra server ([GitHub](https://github.com/dbos-inc/dbos-transact-java)).
    - It has queues, cron scheduling, and durable `recv`/`send` for approval gates.
    - The 1.0 release came out in July 2026 with a Spring Boot integration ([DBOS July 2026](https://dbos.dev/blog/new-in-dbos-july-2026)). **New in the last 3 months.**
    - It is young (~241 stars), but it is the lightest option for a solo developer.
  - **JobRunr OSS** is LGPL and free, but job chaining/workflows, job timeouts, rate limiting and mutexes are **Pro-only**. Pro Business is €850 per production cluster per month, or €1,200/year on the startup tier ([pricing](https://www.jobrunr.io/en/pricing/)). That makes it a poor fit here.
  - **Spring Batch** is the wrong model (it is built for chunked ETL). **Quartz** only covers scheduling.
  - **Spring Modulith** is useful for enforcing module boundaries plus a transactional outbox:
    - 2.0 GA came out in Nov 2025 on Boot 4 ([spring.io](https://spring.io/blog/2025/11/21/spring-modulith-2-0-ga-1-4-5-and-1-3-11-released/)).
    - 2.1.0 came out in June 2026 ([GitHub releases](https://github.com/spring-projects/spring-modulith/releases)).
- **Verdict:** a strong, mature choice for a Java developer. The weak spot is video composition and caption templating, where Java has no Remotion equivalent. One mitigation is a tiny Node Remotion render sidecar, which is free under Remotion's solo license.

### (B) Full TypeScript: Next.js + Node worker
- **LLM:** Vercel AI SDK 6 adds agents, tool-execution approval and MCP ([vercel.com/blog/ai-sdk-6](https://vercel.com/blog/ai-sdk-6)).
- **Media APIs:** official `@fal-ai/client` and the official Replicate Node client.
- **Remotion**
  - **License:** the free license covers "individuals and companies of up to 3 people", explicitly *including automation and commercial use*, with no per-render fee ([pricing](https://www.remotion.dev/docs/license/pricing), [FAQ](https://www.remotion.dev/docs/license/faq)). The FAQ says single-person companies qualify, and "If you are eligible for the Free License, you can also run an automation."
  - The Company License (4+ people) has two parts:
    - **Automators:** $0.01 per render with a $100/month minimum.
    - **Creators:** $25 per seat per month.
    - The combined minimum is $100/month, and Enterprise starts at $500/month.
  - **Captions:** `@remotion/captions` provides `createTikTokStyleCaptions()` for word-by-word pages, fed from whisper.cpp `toCaptions()` or OpenAI Whisper ([docs](https://www.remotion.dev/docs/captions/transcribing)). There is also a TikTok template ([template-tiktok](https://github.com/remotion-dev/template-tiktok)).
  - Remotion is the strongest reason to choose TypeScript here. Per-niche visual presets (title cards, Ken Burns on stills, lower thirds, verse overlays) become React components.
- **Orchestration choices**
  - **Inngest Cloud Free** ([pricing](https://www.inngest.com/pricing)):
    - $0 for 50k executions/month, 5 concurrent steps, 3 workers, and a maximum run length of 30 days.
    - Executions = runs × (steps + 1). My estimate is ~270 runs × ~30 steps ≈ 8k/month, which fits the free tier.
    - Your code, including FFmpeg and Remotion, runs on your own VPS.
    - Pro is $99/month.
  - **Trigger.dev v4 Cloud** ([pricing](https://trigger.dev/pricing)):
    - Plans: Free $0 (includes $5 of credit), Hobby $10/month, Pro $50/month.
    - Compute costs $0.0000338/s on small-1x up to $0.00017/s on medium-2x (2 vCPU / 4 GB), plus $0.000025 per run.
    - Tasks have no timeouts, and waits longer than 5 s are checkpointed and not billed.
    - v4 adds **waitpoint tokens** for human-in-the-loop pauses ([v4 GA](https://trigger.dev/changelog/trigger-v4-ga)), and there is a Python build extension.
    - **Self-hosting is heavy** ([docs](https://trigger.dev/docs/self-hosting/docker)): 3+ vCPU / 6+ GB for the webapp plus 4+ vCPU / 8+ GB for the worker, so use the cloud version.
  - **BullMQ** (MIT, Redis) offers flows (parent/child jobs). Pro is commercial, and its pricing was not verified.
  - Temporal also has a TypeScript SDK.
- **Publishing reference:** Postiz is built on Next.js, NestJS, Prisma and Temporal ([repo](https://github.com/gitroomhq/postiz-app)), so it is easy to read and borrow its provider integrations.
- **Verdict:** the lowest-friction full-stack option, with one language across UI, worker and render templates.

### (C) Python FastAPI worker + Next.js UI
- **When it makes sense:** only if you self-host open models (ComfyUI, Wan, Kokoro, Whisper), or want to borrow Python OSS code directly. Most of the relevant repos are Python: MoneyPrinterTurbo, Pixelle-Video, ViMax, ArcReel and Verticals.
- **GPU economics under $100/month:**
  - A GPU running 24/7 is out of budget.
  - Serverless GPU is the only option:
    - Modal's Starter plan gives $30/month of free credit, and an L40S costs ~$0.000542/s ≈ $1.95/hr. This is third-party data ([usagepricing](https://usagepricing.com/tools/pricing-calculator/modal)), so medium confidence.
    - A RunPod serverless 4090 or L4 costs ~$1.10–1.15/hr ([RunPod pricing](https://www.runpod.io/console/pricing)).
- **Verdict:** treat it as a later add-on (a ComfyUI worker on serverless GPU), not the core platform.

### Desktop (Tauri/Electron) vs web
- **Against desktop**
  - Publishing at scheduled times, OAuth token refresh, and fal or Replicate webhooks all need an always-on host with a public HTTPS URL.
  - A home PC in Vietnam is exposed to sleep, power and ISP outages and NAT, which would break schedules.
  - Desktop only wins for local-GPU generation (e.g. [LocalMiniDrama](https://github.com/xuanyustudio/LocalMiniDrama), Electron), and that is not the plan here.
- **Recommendation**
  - A self-hosted web app behind auth (e.g. Cloudflare Access or app login), made mobile-friendly or a PWA so you can approve videos from your phone.
  - Optionally, later, a desktop "local GPU worker" that pulls jobs from the server queue.

---
## 3. Reusable open source (activity checked via GitHub search on 2026-10-09)
| Project | License | Stars / activity | What it covers | How to use it |
|---|---|---|---|---|
| [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo) | MIT | ~129k; v1.3.8 released **2026-10-03** ([releases](https://github.com/harry0703/MoneyPrinterTurbo/releases)) | Topic → script → **stock footage** (Pexels, Pixabay, Coverr, MuAPI) → TTS (incl. Kokoro, VoxCPM cloning) → Whisper subtitles → FFmpeg/MoviePy; Redis task queue; Upload-Post publishing | Borrow the subtitle timing, TTS-provider abstraction, FFmpeg hardening (deadlines, temp cleanup, BT.709 color) and queue-recovery ideas. It is not character-consistent generative video. |
| [Pixelle-Video](https://github.com/ATH-MaaS/Pixelle-Video) | Apache-2.0 | ~28.8k; last listed update 2026-06-01 | Topic → script → **AI image or video per sentence** (ComfyUI or RunningHub, or direct APIs: Seedream, Seedance, Kling, DashScope) → TTS → BGM → templates | Closest match to an illustrated or painted story niche. Its ComfyUI workflow wrappers are reusable. |
| [ViMax (HKUDS)](https://github.com/HKUDS/ViMax) | MIT (badge and third-party; [review](https://dev.to/dibi8/vimax-review-agentic-multi-scene-video-generation-from-hkuds-5dc1)) | ~12.6k; v1.2.0 Web UI on **2026-07-20** | Agentic idea/script/novel → storyboard → **character extraction and reference-image selection for consistency** → video | Mine its agent prompts (screenwriter, storyboard, character extractor, best-image selector). |
| [ArcReel](https://github.com/ArcReel/ArcReel) | **AGPL-3.0** + NOTICE | ~5.4k; created Feb 2026, active | Self-hosted novel/script → character, scene and prop assets → storyboard → video → CapCut draft; **cross-shot consistency, multi-provider support, cost tracking**; Claude Agent SDK; SQLite or Postgres | The architecture closest to Media Studio. Read it for the data model; AGPL is fine for private use but don't paste its code into closed code you distribute or offer as a service. |
| [Verticals v3 / youtube-shorts-pipeline](https://github.com/rushindrasinha/youtube-shorts-pipeline) | MIT | ~2.3k; created Feb 2026, active | **Niche profiles** (tone, visual style, caption font, music mood) → research → script → Gemini Imagen b-roll → Edge TTS / ElevenLabs → Whisper ASS captions → FFmpeg Ken Burns → private YouTube upload; claims ~$0.11 per video | Copy the "niche profile" concept directly as your per-niche preset. |
| [short-video-maker](https://github.com/gyoridavid/short-video-maker) | MIT (depends on Remotion's license) | ~1.4k; **no push since ~mid-2025** (GitHub `pushed:` search) | Remotion + Kokoro-js + whisper.cpp + Pexels; REST and MCP server; English only | Small, readable Remotion caption composition you can study. Stale. |
| [ShortGPT](https://github.com/RayVentura/ShortGPT) | MIT | ~8k; **no push since ~mid-2025** | LLM editing language, EdgeTTS/ElevenLabs, Pexels | Reference only. Stale. |
| [AI-Youtube-Shorts-Generator](https://github.com/Anil-matcha/AI-Youtube-Shorts-Generator) (moved from SamurAIGPT) | MIT | ~5.3k | Long video → clips (clipping, not generation) | Not relevant to your flow. |
| [Postiz](https://github.com/gitroomhq/postiz-app) | **AGPL-3.0** | ~36.9k, very active | Scheduler for 20–30+ networks; public API, n8n node, MCP; NestJS, Next.js, Prisma, **Temporal (required since v2.12.0)**, Redis | Self-host it (free) or use Cloud: Standard $29 for 5 channels, Team $39 for 10, Pro $49 for 30 ([pricing](https://postiz.com/pricing)). Self-hosting requires your own developer apps on each platform; per its README, approval from Meta, YouTube or TikTok "can take weeks". Floor is 2 vCPU / 2 GB; 4 GB+ recommended ([requirements](https://docs.postiz.com/installation/system-requirements)). |
| [Mixpost](https://github.com/inovector/mixpost) | MIT (Lite) | ~3.8k, active (Laravel/PHP) | **Lite only publishes to Facebook Pages, X and Mastodon.** Instagram, TikTok and YouTube need Pro at $299 one-time ([pricing](https://mixpost.app/pricing)) | A weak fit (PHP, and the needed platforms are paid). |
| [n8n](https://github.com/n8n-io/n8n) | Sustainable Use License (fair-code) | ~207k | Workflow automation; faceless-video templates are mostly paid Gumroad bundles or vendor tutorials (Creatomate, Shotstack, json2video) | See §6. |
| [ComfyUI](https://github.com/Comfy-Org/ComfyUI) | GPL-3.0 (not re-verified here) | ~136k (moved to the Comfy-Org org) | Node graphs for open image/video models | Only with a GPU, e.g. serverless. |

**Takeaway:**
- No single repo matches "per-niche character + story → consistent multi-shot video → review → multi-account scheduling".
- Build your own thin orchestrator, and borrow:
  - Verticals' niche-profile concept.
  - ViMax's and ArcReel's consistency and storyboard agents.
  - MoneyPrinterTurbo's subtitle and FFmpeg hardening.
  - Remotion's caption templates.
  - Postiz or Upload-Post for publishing.

---
## 4. Publishing constraints that shape the architecture (verified on official pages)
- **TikTok:** "All content posted by unaudited clients will be restricted to private viewing mode" until the API client passes an audit (Direct Post docs, last updated 2026-08-24, [TikTok](https://developers.tiktok.com/docs/en/content-posting-api-reference-direct-post)).
- **YouTube:**
  - Uploads through `videos.insert` from unverified API projects created after 2020-07-28 are restricted to private until audited.
  - The quota is "100 calls per day … 1 unit in the Video Uploads quota bucket" ([Google](https://developers.google.com/youtube/v3/docs/videos/insert)).
  - The old figure of 1,600 units per upload is outdated. Third-party sources say the change happened on 2025-12-04 and 2026-06-01 ([outlierkit](https://outlierkit.com/resources/youtube-api-quota/)), which is a **recent change**.
- **Implication:**
  - Self-hosted publishing (your own app, or Postiz self-hosted) means passing the TikTok, YouTube and Meta reviews yourself.
  - The fastest path is a hosted posting API whose apps are already approved. Upload-Post ([pricing](https://www.upload-post.com/pricing)):
    - Free: 10 uploads/month, 2 profiles. Its free-tier platform list did not show TikTok.
    - Professional: $33/month ($400/year), unlimited uploads, 25 profiles, where 1 profile = 1 account per platform. That maps cleanly to **1 profile per niche**.
    - It also includes 1,000 minutes/month of an FFmpeg editor API.
  - Postiz Cloud at $29–49/month is the other managed option.
- **Design advice:**
  - Put publishing behind a `Publisher` interface with adapters for Upload-Post, Postiz API, YouTube direct and Meta Graph direct.
  - Start with Upload-Post or Postiz Cloud. Migrate to direct APIs once your apps pass audit.

---
## 5. Recommended architecture

**Shape:** a modular monolith deployed as 2 processes from 1 codebase:
1. **web/api**: the review UI, niche config, schedule calendar, and the webhook receivers.
2. **worker**: workflow and activity execution, FFmpeg/Remotion rendering.

Plus Postgres, R2, and the workflow engine. No microservices.

**Modules**
- `niche` (preset: style, default character, voice, caption style, accounts, auto-approve flags)
- `story/research`
- `script` (JSON shot list)
- `assets` (character sheet, keyframes, versioned)
- `shots` (video generation per shot)
- `audio` (TTS, music, alignment)
- `render`
- `review`
- `publish`
- `cost-ledger` (each external call logs its estimated or actual $; a budget guard stops the pipeline at the monthly cap)

**Workflow per video (durable)**
1. research → script → **[gate: script approval unless niche.autoApproveScript]**
2. character and keyframes → per-shot video, fanned out with a concurrency limit, each shot retryable or regenerable on its own
3. TTS, music, captions → assemble → **[gate: final approval]**
4. schedule → publish to N accounts → record post IDs

**Other design points**
- Approvals arrive as signals/events from the UI. Regenerating a single shot is a signal that re-runs one child step.
- Use webhooks (fal and Replicate support callback URLs) with polling fallback and idempotency keys keyed on (videoId, shotNo, attempt).

**Database:** Postgres.
- Relational core: niches, stories, videos, shots, assets, posts, cost_entries.
- JSONB for prompts and model parameters.
- The queue lives in Postgres too when you use DBOS, pg-boss or Inngest/Trigger state.

**Object storage:** Cloudflare R2 ([pricing](https://developers.cloudflare.com/r2/pricing/), page updated 2026-10-01).
- $0.015/GB-month standard storage.
- Free tier: 10 GB-month, 1M Class A and 10M Class B operations.
- Class A $4.50/M, Class B $0.36/M, **egress free**.
- The free egress matters: the publisher, the platforms' pull-from-URL ingestion, and your phone review all download videos.
- AWS S3 charges for internet egress, so R2 wins.
- My estimate: ~350 MB per video (intermediates plus final) × 270/month. With a lifecycle rule deleting intermediates after 14–30 days, about 20–60 GB stays stored, which is **~$0.15–0.75/month**.

**Monolith vs services:** a monolith. The only justified split is a separate render process or container, so that a Remotion or FFmpeg memory spike can't take down the UI. Use a container memory limit and concurrency 1–2.

---
## 6. Can n8n alone cover the MVP?

**Partly. Use it to validate content, not as the product.**

What works:
- HTTP nodes call fal, Replicate and LLMs.
- A Wait node resumes on a webhook, which gives you an approval gate.
- Cron triggers handle scheduling.
- Self-hosted Community Edition is free.
- The license allows your own internal business use ([license FAQ](https://docs.n8n.io/sustainable-use-license/)). Running your own channels is fine. Reselling n8n-as-a-service is not.

Where it falls short:
- n8n Cloud Starter (€20/month billed annually) has **2.5k executions, 5 concurrent executions, and a 5-minute maximum execution duration**. Pro (€50/month) allows 40 minutes ([pricing](https://n8n.io/pricing/)).
- "Run bash scripts" (FFmpeg) is only available self-hosted.
- Per-niche presets, versioned assets, per-shot regeneration, a side-by-side review UI, a cost ledger and multi-account scheduling all become hard to maintain as JSON workflows.

How to use it:
- Optionally, for 1–2 weeks: one niche, an n8n workflow, and manual upload to test whether Bible stories get views.
- Then write the real app.
- As a developer, you can also skip n8n and build the thin vertical slice directly. With Inngest or Temporal, that is about as fast.

---
## 7. Hosting cost (monthly, ex-VAT unless noted)

**Workload sizing:** app + Postgres + worker + FFmpeg/Remotion, with renders running one at a time.
- 4 vCPU / 8 GB is comfortable.
- Add ~2 GB if you self-host Temporal, and ~2–4 GB if you also self-host Postiz (which brings its own Temporal and Redis). Then 12 GB is safer.

| Provider / plan | Spec | Price | Notes |
|---|---|---|---|
| **Hetzner CX33** | 4 vCPU / 8 GB / 80 GB | €8.49 (was €6.49), $9.99 in USD terms ([Hetzner official](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/)) | **The whole CX/CAX line has shown "not available" since early Sept 2026**; a capacity notice has been open since 2026-06-26 ([vincentschmalbach](https://www.vincentschmalbach.com/hetzner-cheap-cloud-unavailable-price-increases/), [bex.co 2026-09-25](https://bex.co/blog/2026/09/25/hetzner-cheap-tier-unavailable-price-anchor)). Best value if you can get one. |
| Hetzner CPX32 | 4 vCPU / 8 GB | €35.49 (was €13.99), +154% on 2026-06-15 (official table above) | No longer cheap. CPX22 went €7.99 → €19.49. |
| Hetzner CAX21 (ARM) | 4 vCPU / 8 GB | €10.49 (official table) | Also unavailable. Remotion and Chrome on ARM need testing. |
| **Contabo Cloud VPS 4 / 6** | 4 vCPU / 8 GB / 100 GB; 6 vCPU / 12 GB | Page shows €5.50 and €4.40 (VPS 4), €7.50 and €6.00 (VPS 6); the lower figure appears to be a 24-month-term price ([contabo.com/en/vps](https://contabo.com/en/vps/)) | Lineup **restructured Aug 2026** into Core / Performance / Max ([vpsbenchmarks](https://www.vpsbenchmarks.com/announcements/contabo-launches-a-new-vps-portfolio-core-performance-and-max-performance-01)). Shared CPU, 200–300 Mbit port. Fine for this bursty workload. **Recommended default.** |
| netcup RS 1000 G12 | 4 dedicated cores / 8 GB / 256 GB NVMe | ~€12.37–14.87 (third-party, [vpsbenchmarks](https://www.vpsbenchmarks.com/hosters/netcup/plans/2240)) | Good dedicated-core alternative. |
| DigitalOcean Basic | 2 vCPU / 4 GB; 4 vCPU / 8 GB | $24; $48 ([official](https://www.digitalocean.com/pricing/droplets)) | Per-second billing since 2026-01-01. Pricey for this workload. |
| Railway | usage-based | Hobby $5/month includes $5 of usage; CPU $0.00000772/vCPU-s (~$20/vCPU-month), RAM $0.00000386/GB-s (~$10/GB-month); egress $0.05/GB ([official](https://railway.com/pricing)) | An always-on 1 vCPU / 2 GB worker costs about $40/month. Not cost-effective. |
| Fly.io | per machine | shared-cpu-4x 1 GB $8.78; performance-2x 4 GB $66; extra RAM $6/GB-month; Managed Postgres from $38 ([official](https://fly.io/pricing/)) | Not cost-effective with Remotion's RAM needs. |
| Oracle Always Free A1 | equivalent of 4 OCPU / 24 GB | $0 ([Oracle docs](https://docs.oracle.com/en-us/iaas/Content/FreeTier/resourceref.htm)) | Idle-reclaim rule (under 20% CPU, network and memory at p95 over 7 days), capacity errors, and an unverified 2026 report of a cut. Only as a free experiment. |
| Cloudflare R2 | storage | ~$0–1 at this volume | See §5. |
| Hetzner Object Storage | 1 TB + 1 TB egress | ~€6.49 after the April 2026 increase (third-party, [agentdeals](https://agentdeals.dev/hetzner-pricing-2026)) | Only worth it if you are on Hetzner and store a lot more. |

**Estimated infrastructure total:**
- **~€6–15/month**: Contabo or Hetzner VPS + R2 + a domain.
- Optional additions:
  - Workflow SaaS: Inngest Free $0, Trigger.dev Hobby $10, or Temporal Cloud ~$1–2 (my estimate).
  - Publishing SaaS: Upload-Post $33/month billed annually, or Postiz Cloud $29.
- This leaves the ~$100 budget for AI calls.
- Back up with a nightly `pg_dump` to R2.

---
## 8. Concrete recommended stacks

### (1) Java-strong solo developer
- **Backend:** Spring Boot 4.1 on Java 25 (`spring.threads.virtual.enabled=true`), with Spring Modulith 2.x for module boundaries.
- **AI clients**
  - Spring AI 2.0.x for LLM work (Anthropic, Gemini, OpenAI), with structured output into Java records for the shot list.
  - `ai.fal.client:fal-client` (or `-async`) for image and video models.
  - Spring `RestClient` for Replicate and TTS vendors.
- **Orchestration**
  - **Temporal** via `temporal-spring-boot-starter` 1.31.0. Use Temporal Cloud pay-as-you-go to start ($150 of credit), or `temporalio` with Postgres self-hosted on the same VPS.
  - Lighter alternative: **DBOS Java 1.0** (MIT, Postgres-only).
  - Avoid JobRunr OSS, which lacks chaining and timeouts.
- **Media**
  - FFmpeg CLI via ProcessBuilder with a typed builder.
  - Captions as ASS karaoke from word timestamps (whisper.cpp or TTS alignment).
  - Optionally, later: a **Remotion Node sidecar** behind a REST endpoint for niche templates (free license).
- **Data and storage:** Postgres 17/18 + Flyway; R2 via AWS SDK v2 (S3-compatible).
- **UI**
  - Next.js (App Router) review dashboard calling the Spring REST API, typed via OpenAPI codegen.
  - If you don't want React: Thymeleaf + htmx inside Spring, which keeps everything in one language.
- **Publishing:** Upload-Post API now; Postiz or direct APIs after the platform audits.
- **Deploy:** Docker Compose on a Contabo Cloud VPS 6 (6 vCPU / 12 GB) or a Hetzner CX33 if one becomes orderable, with Caddy for TLS and Cloudflare in front.

### (2) TypeScript-strong solo developer
- **Repo:** a pnpm monorepo with `apps/web` (Next.js: UI, API routes, webhooks) and `apps/worker` (Node 22+).
- **AI clients:** Vercel AI SDK 6 (`generateObject` with Zod schemas for script and shot list), `@fal-ai/client`, `replicate`.
- **Orchestration**
  - **Inngest Cloud Free:** `step.run`, `step.waitForEvent` for approval gates, cron for publishing, concurrency limits. Your code and renders run on your VPS.
  - Or **Trigger.dev v4 Cloud Hobby** ($10/month) if you'd rather offload render compute too, with waitpoint tokens for approvals.
  - Fully self-hosted alternative: BullMQ flows + Redis, or a Postgres queue such as pg-boss (not researched here).
- **Composition:** **Remotion** (free for ≤3 people, automation allowed) with one composition per niche style. Use `@remotion/captions` `createTikTokStyleCaptions()` for word-by-word captions and FFmpeg for normalize and concat.
- **Data and storage:** Postgres + Drizzle (or Prisma); R2.
- **Publishing:** Upload-Post or Postiz Cloud now. Postiz self-hosted (also TypeScript) later if you want to own it.
- **Deploy:** same single VPS. Remotion needs headless Chrome and ≥4 GB RAM; render with concurrency 1–2 and tune with `npx remotion benchmark` ([docs](https://remotion.dev/docs/performance)).

**Objective tie-break:**
- If you are equally comfortable in both, choose **(2) TypeScript**. Remotion, the official SDKs and Postiz save more time than Temporal-Java maturity buys.
- If Java is clearly your strength, choose **(1)** and add the Remotion sidecar only when caption and templating quality becomes the bottleneck.

---
## 9. Changed in the last ~3 months (flagged)
- **Hetzner**
  - Cost-optimized CX/CAX has been unorderable since early Sept 2026.
  - The June 15 price adjustment (CPX +144–175%) and the April 1 adjustment (up to +37%) came earlier. The official doc was last changed 2026-07-08.
- **Releases and docs**
  - Spring AI 2.0.1 (2026-08-21). The 2.0 GA was 2026-06-12, slightly older.
  - DBOS Java 1.0 (July 2026).
  - ViMax v1.2.0 Web UI (2026-07-20).
  - MoneyPrinterTurbo v1.3.8 (2026-10-03).
  - TikTok Direct Post docs updated 2026-08-24.
  - R2 pricing page updated 2026-10-01; prices look unchanged at $0.015/GB.
  - The YouTube upload quota moved to a separate bucket on 2026-06-01 (third-party source).
- **Contabo:** VPS lineup restructured on 2026-08-13 because of hardware cost increases.
- **Undated:** Remotion's Creators/Automators company-license model and Temporal Cloud's "no base fee" pay-as-you-go may also be recent. The dates were not verified, so confirm both before relying on them.

## 10. Gaps and low-confidence items
- No benchmark was found for Remotion or FFmpeg render time of a 60 s 1080×1920 video on a small VPS. The 0.5–3 min figure is my estimate.
- The Temporal Cloud per-video action count, and therefore the ~$1–2/month cost, is my estimate.
- BullMQ Pro pricing and Hatchet's license and pricing were inconsistent across third-party sources.
- ViMax's MIT license was confirmed only via its README badge and third parties.
- ComfyUI's GPL-3.0 license was not re-verified.
- I could not check exact last-commit dates for short-video-maker, ShortGPT and AI-Youtube-Shorts-Generator directly. Their staleness is inferred from GitHub search `pushed:` filters (no push after 2025-07-01).
