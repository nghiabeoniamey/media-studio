# Media Studio: decision synthesis for model choice, costs, publishing and tech stack (as of 2026-10-09)

**How to read this.** This synthesis is built from four research reports, and each report was checked by an independent verifier.
- **(corrected):** the verifier changed the original value, and the corrected value is used here.
- **(est.):** my own estimate, or a figure that could not be verified.
- **(3p):** the figure comes only from third-party sources, so confidence is lower.
- **[NEW]:** changed in roughly the last 3 months (after 2026-07-09).
- All prices are list prices in USD unless marked otherwise.

---

## 0. Bottom line

1. **The budget cannot pay for the planned volume with full AI video.**
   - "Full AI video on every shot" (S1) costs at least **~$155/month for one niche at 2 videos/day**, even on the cheapest credible model (Grok Imagine 1.5 Lite, $0.03/s).
   - On models with good quality and character consistency, S1 costs **$350–1,400/month**. See §2.
2. **Two strategies fit under $100/month for one niche:**
   - **S2, the "motion comic" hybrid, as 45 s reels:** $59–154/month depending on which model makes the hero clips.
   - **S3, a self-hosted open model on a rented GPU:** $43–59/month for 45 s reels and $86–123/month for 2-minute videos. The quality ceiling is lower and you take on DevOps work.
3. **The $100 is a total across all niches** (verifier correction; the original budget math was per niche). A second niche halves the volume you can afford. Three niches at ~2/day each is only reachable with S3.
4. **From Vietnam, YouTube is the only platform with a clear payout path.**
   - Facebook Content Monetization: Vietnam is not on Meta's official list of 70 countries (verifier confirmed this on Meta's own page; confidence raised from low to high).
   - TikTok Creator Rewards: open only to creators based in 8 countries.
   - So Facebook, Instagram and TikTok are reach and funnel channels, not income.
5. **The biggest policy risk is YouTube's rule against templated AI content.**
   - YouTube's July 2026 restructuring names "image slideshows, templated storylines" and "AI-generated content made with generic or unoriginal templates" as non-monetizable.
   - A 5.87M-subscriber AI Jesus channel was removed in January 2026.
   - S2 is the cheapest format and also the one closest to these rules. Make it defensible with real narrative arcs, varied series formats and enough motion.
6. **Google's cheap Veo route is closing.** All Veo 3.1 models on the Gemini API shut down **2026-10-22** [NEW]. The verifier added this; the original report did not flag it. Do not build on that route.
7. **Publishing:**
   - TikTok through your own developer app is not viable.
   - YouTube API uploads stay private until your project passes an audit.
   - Meta (Facebook and Instagram) works without App Review for your own accounts. Test this first.
   - Start with **Upload-Post Basic at $16/month billed annually**. It covers 5 niches × 4 platforms, including TikTok.
8. **Tech stack:**
   - A web app on one VPS (€6–15/month).
   - A modular monolith plus a worker process, Postgres, Cloudflare R2 storage and a durable workflow engine.
   - S2 makes video composition the core of the product. Remotion is free for teams of 3 or fewer, automation included. That tips the choice to TypeScript unless Java is clearly your stronger language.
9. **Suggested start:**
   - Bible niche only, S2 45 s reels, 1/day for weeks 1–4.
   - Hero clips on MiniMax H3 Max 768p: ≈ **$51/month** (30 × $1.71).
   - One-time spend: ~$10–25 (est.) on a blind model bake-off and ~$12–40 on a character library.
   - Move to 2/day only if retention holds.

---

## 1. Verified video model comparison table

Prices are per output second.

| Model | API route | $/s at 720p class (audio) | Max clip | Character-consistency inputs | 9:16 | Best for (AA image-to-video Elo) | Status | Confidence | Sources |
|---|---|---|---|---|---|---|---|---|---|
| **MiniMax H3 Max** | MiniMax direct, fal, Runway | **$0.08 at 768p**, audio included; **$0.05 at 480p** | 5–15 s | ≤9 images, ≤3 videos, ≤3 audio (12 files max). 2 images free, then $0.074 per image. Reference video $0.143/s at 768p. First and last frame supported | Yes (image-to-video follows the input's aspect ratio) | Best value for hero shots in any style; **#1 at 1195** (ranks 2–6 statistically tied) | GA, Aug 2026 [NEW] | High | [MiniMax pricing](https://platform.minimax.io/docs/guides/pricing-paygo), [API](https://platform.minimax.io/docs/api-reference/video-generation-v2-create), [AA leaderboard](https://artificialanalysis.ai/video/leaderboard/image-to-video) |
| MiniMax H3 | MiniMax, Runway | $0.08 at 768p ($0.13 at 2K) | 4–15 s | ≤9 images; 5 free, then $0.04 each | Yes | 1181 | GA, Jul 31 2026 [NEW] | High | [MiniMax pricing](https://platform.minimax.io/docs/guides/pricing-paygo) |
| **Gemini Omni 1.1 Flash** | Gemini API (paid tier only), Runway | **≈$0.10** (audio always on). 360p drafts $0.034 on Runway; 1080p $0.15 and 4K $0.30 on Runway **(corrected: the original $0.152/$0.304 figures were extrapolated)** | ~10 s per generation; can be extended +10 s at a time up to 40 s | Several image references (the doc example uses 6; no maximum stated). ≤3 video references of ≤3 s each. No audio references. **No images of recognizable people.** Minors blocked in the EEA, Switzerland and UK | 9:16 or 16:9 only | Cinematic realism for hero shots. 1178; leads the silent leaderboard at 1368, but that entry is the May preview, not 1.1 | GA Aug 27 2026 [NEW]. The preview endpoint shuts down Oct 22 **(corrected from Sep 30)** | High | [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [Omni docs](https://ai.google.dev/gemini-api/docs/omni), [Runway pricing](https://docs.dev.runwayml.com/guides/pricing/), [deprecations](https://ai.google.dev/gemini-api/docs/deprecations) |
| Veo 3.1 Lite | Vertex only (preview, us-central1). **The Gemini API route shuts down 2026-10-22** | $0.03 video-only on Vertex. $0.05 with audio on the Gemini API (ending) | 4/6/8 s | **No references.** Image input is allowed for adults only. The Vertex page contradicts itself on whether Lite accepts image input | Yes | Was the "cheap realism" pick. Now uncertain. 1071 | Gemini API: shutting down [NEW]. Vertex: Preview | High on price, low on availability | [Vertex pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing), [deprecations](https://ai.google.dev/gemini-api/docs/deprecations), [Vertex model page](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/veo/3-1-generate) |
| Veo 3.1 Fast | Vertex GA (`veo-3.1-fast-generate-001`) | $0.08 silent on Vertex. $0.10 with audio on the Gemini API (ending Oct 22) | 4/6/8 s (must be 8 s when using references) | ≤3 reference images. Image-to-video is `allow_adult` only, so no children in input images | Yes | Realism. 1082 | Vertex GA; retirement "Nov 17, 2026 or later" | High | [Veo docs](https://ai.google.dev/gemini-api/docs/veo), [Vertex pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing) |
| **Wan 3.0** | Alibaba Model Studio (Singapore, US and other regions), Runway, fal, OpenRouter | **$0.10**, native audio ($0.05 at 480p) | 2–30 s (the 2 s minimum is 3p) | Image, video, audio and document references can be combined; counts not verified | Yes | 15–30 s long takes, lifelike faces. 1164; 1362 on the silent board | Launched Aug 24 [NEW], but the API docs still say "preview". Result URLs expire after 24 h | High on price, medium on references | [Alibaba blog](https://www.alibabacloud.com/blog/wan3-0-30-second-ai-video-generation-from-any-input_603452), [API reference](https://www.alibabacloud.com/help/en/model-studio/wan3-video-generation-api-reference) |
| Kling 3.0 Std / O3 Std | fal. Direct Kling API is sold in packages from $700 per 5,000 units, **plus a Trial package of about $9.80 per 100 units (3p) (corrected: $700 is not the only way in)** | **$0.084 silent**; $0.112 (O3) or $0.126 (V3) with audio; voice control $0.154 | 3–15 s, with `multi_prompt` multi-shot | `elements`: a frontal image plus reference images, or a video | Yes | Stylized characters such as kittens. Kling 3.0 Pro scores 1055 | GA (Feb 2026) | High on fal, medium for the direct API | [fal V3](https://fal.ai/models/fal-ai/kling-video/v3/standard/image-to-video), [fal O3](https://fal.ai/models/fal-ai/kling-video/o3/standard/reference-to-video), [Kling quick start](https://kling.ai/document-api/guides/get-started/quick-start), [eesel (3p)](https://www.eesel.ai/blog/kling-ai-pricing) |
| Kling 4.0 / 4.0 Flash | **No public API** | No API price published | 3–30 s (Flash: 3–20 s, 720p) | ≤10 images, 5 videos, 7 elements, 15 references total; 10 keyframes | Yes | Worth watching for multi-reference kitten work | Announced Sep 28 [NEW]. Full model due "October" | High that there is no API yet | [Pandaily](https://pandaily.com/kling-ai-kling-4-0-30-second-native-video-multi-reference-control), [fal explainer](https://fal.ai/learn/tools/what-is-kling-4-0) |
| Seedance 2.5 | fal, Runway (80-credit minimum per generation), BytePlus. The BytePlus route is reportedly not sold in the US, CA, UK, AU or NZ (3p); Vietnam not confirmed | fal **$0.473**; Runway $0.30; BytePlus ≈$0.231 (3p). Audio is included and turning it off saves nothing | 4–30 s; native output is 480p/720p **(corrected: 1080p on BytePlus not verified)** | Up to 50 references (30 images, 10 videos, 10 audio). **Rejects real human faces**; the classifier judges each image separately | Yes | Top quality, but over budget and risky for photoreal uploads | Released Jul 31 [NEW] | High on fal and Runway, medium on BytePlus | [fal](https://fal.ai/models/bytedance/seedance-2.5/image-to-video), [Runway](https://docs.dev.runwayml.com/guides/pricing/), [ComfyUI PR on faces](https://github.com/Comfy-Org/ComfyUI_frontend/pull/19638), [Cellcog (3p)](https://cellcog.ai/blog/seedance-2-5-pricing/) |
| Seedance 2.0 Mini | BytePlus, Runway, fal | ≈$0.08 on BytePlus (3p); $0.16 on Runway | 4–15 s | ≤12 references (Seedance 2.0) | Yes | Stylized characters (reviewer opinion) | GA, mid-2026 | Medium | [Runway](https://docs.dev.runwayml.com/guides/pricing/) |
| **Grok Imagine Video 1.5 Lite** | xAI, fal, Runway | **$0.03**, native audio ($0.02 at 480p), **plus $0.01 per input image** | 1–15 s | **None**: no references, no first/last frame, no keyframes. Single-image image-to-video only | Yes | The lowest-cost floor for b-roll and simple hero shots. Quality unverified (#17 on text-to-video, 3p). **xAI charges for generations that violate its policy, plus a $0.05 fee for pre-generation rejections** | Launched ~Oct 1 [NEW] | High on price, low on quality evidence | [xAI pricing](https://docs.x.ai/developers/pricing), [xAI video docs](https://docs.x.ai/developers/model-capabilities/video/overview) |
| Grok Imagine Video 1.5 | xAI, fal, Runway | $0.14 ($0.08 at 480p) plus $0.01 per image | 1–15 s (reference mode capped at 720p and 15 s) | ≤14 images, 3 voices, 4 keyframes | Yes | Multi-reference stylized characters. 1098 | GA, Jun 2026 | High | [xAI pricing](https://docs.x.ai/developers/pricing) |
| Vidu Q4 Preview | Vidu API | ≈$0.095 (3p). Official list price starts at $0.045 at 540p. **30% off image-to-video and reference-to-video until Nov 30 (corrected)** | Image-to-video 3–16 s; reference-to-video 1–16 s | 1–15 images plus 0–3 audio clips | Yes (in reference mode) | 1179 (statistically tied at #2–6). Reportedly bills failed generations (3p) | Preview, Oct 7 [NEW] | Medium | [GlobeNewswire](https://www.globenewswire.com/news-release/2026/10/07/3376813/0/en/shengshu-technology-launches-vidu-q4-preview-a-next-generation-ai-video-model-built-for-lifelike-performances.html), [Unite.AI](https://www.unite.ai/vidu-releases-q4-preview-of-next-generation-flagship-ai-video-model/) |
| LTX-2.3 Fast / LTX-2.5 Fast (API) | LTX API, fal | 2.3 Fast **$0.03**; 2.5 Fast $0.09 (native audio) | 2.5: up to 20 s (3p) | API references not verified. Open weights, so you can train a LoRA | Yes (720×1280) | Budget or open-weights path. 946 (2.3) / 1038 (2.5) | 2.5 open weights Aug 11 [NEW; date is 3p] | High on price | [LTX pricing](https://docs.ltx.video/pricing), [HF LTX-2.5](https://huggingface.co/Lightricks/LTX-2.5) |
| PixVerse V6 | fal | $0.045 silent / $0.06 with audio | Not verified | Not verified (multi-shot supported) | Yes | Cheap stylized image-to-video. 1070 | GA, Mar 2026 | High on price | [fal](https://fal.ai/pixverse-v6) |
| Wan 2.2 A14B (open weights, Apache 2.0) | fal, self-host | $0.08 on fal (seconds counted at 16 fps) | ~5 s (81 frames at 16 fps) | LoRA when self-hosted | Yes | The S3 engine | Open weights, Jul 2025 | High | [fal](https://fal.ai/models/fal-ai/wan/v2.2-a14b/image-to-video), [HF Wan-AI](https://huggingface.co/api/models?author=Wan-AI&limit=100) |
| Agnes Video 2.5 | Agnes | $0.025 | Not verified | Not verified | Not verified | 1031; small vendor | Aug 2026 | Low | [Agnes pricing](https://wiki.agnes-ai.com/en/docs/pricing) |
| Runway Gen-4.5 / Luma Ray3.2 | Runway / Luma | $0.12 / $0.06–0.09 | — | — | — | Not recommended on cost | GA | High | [Runway](https://docs.dev.runwayml.com/guides/pricing/), [Luma](https://lumalabs.ai/api) |
| Sora 2 | — | — | — | — | — | — | **Retired: API shut down Sep 24, 2026** [NEW] | High | [TechJack](https://techjacksolutions.com/ai-brief/openai-videos-api-sora-2-deprecated-september-2026/) |

**Caveats that change how you read the table:**
- **Leaderboard limits.**
  - Ranks 2–6 on the image-to-video board are statistically tied.
  - HiDream-O1-Video (1175, hosted-only) was left out of the original report.
  - Artificial Analysis says a v2.0 board at 1080p is coming.
  - **No public benchmark tests Pixar-3D or painterly styles.** Run your own blind test on 10 prompts per niche. ([AA](https://artificialanalysis.ai/video/leaderboard/image-to-video))
- **Watch the hidden per-input charges:**
  - H3 Max: $0.074 per reference image beyond 2.
  - xAI: $0.01 per input image.
  - Runway: 1 credit ($0.01) per Omni reference image or start frame.
  - Seedance and Agnes bill input video seconds.
  - Sources: [MiniMax](https://platform.minimax.io/docs/guides/pricing-paygo), [xAI](https://docs.x.ai/developers/pricing), [Runway](https://docs.dev.runwayml.com/guides/pricing/).
- **Billing for blocked generations varies.**
  - Veo does not charge when a generation is blocked ([Veo docs](https://ai.google.dev/gemini-api/docs/veo)).
  - xAI charges for policy-violating generations ([xAI](https://docs.x.ai/developers/pricing)).
  - This matters for crucifixion scenes and scenes with infants.
- **Output links expire, so download every result immediately.** Wan 3.0 and Vidu URLs last 24 h; Veo keeps files for 2 days ([Wan API](https://www.alibabacloud.com/help/en/model-studio/wan3-video-generation-api-reference), [Veo docs](https://ai.google.dev/gemini-api/docs/veo)).
- **Children in Bible scenes.**
  - Veo image input is adults-only.
  - Omni blocks minors in uploads only in the EEA, Switzerland and UK.
  - MiniMax has safeguards against misuse involving minors.
  - Test Nativity, baby Moses and boy David prompts on every candidate model before committing.

---

## 2. Cost model

### 2.1 Unit prices used

| Item | Unit price | Source |
|---|---|---|
| LLM: script, shot list, prompts (Claude Sonnet 5.5) | $2 / $10 per million tokens (input/output); Batch $1 / $5 | [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing) |
| Keyframes (Nano Banana 2.1, 1K; 9:16 at 1K = 768×1376) | $0.0336 standard / $0.0168 Batch per image. Input is $1.50 per million tokens, so 4–5 reference images add about $0.002–0.004 per image (est., corrected). **Planning figures: $0.04 standard / $0.02 Batch** | [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Character sheets (Nano Banana Pro) | $0.134 per image ($0.067 Batch) | [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Narration TTS (Gemini 3.8 Flash TTS) | $0.0135/min until 2026-12-31, then **$0.027/min** from 2027-01-01. Batch is half price. **Planned at the 2027 Batch rate of $0.0135/min** | [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Caption alignment (WhisperX on the VPS) | $0 (BSD-2 license) | [WhisperX](https://github.com/m-bain/whisperX) |
| Music (Lyria 3.5) | $0.08 per song. A 30-track library per niche costs $2.40 once | [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Storage (Cloudflare R2) | $0.015/GB-month, free egress, 10 GB-month free. About 350 MB per video (est.) | [R2 pricing](https://developers.cloudflare.com/r2/pricing/) |
| Video: Grok 1.5 Lite 720p | $0.03/s plus $0.01 per input image | [xAI pricing](https://docs.x.ai/developers/pricing) |
| Video: MiniMax H3 Max | $0.05/s at 480p; $0.08/s at 768p | [MiniMax pricing](https://platform.minimax.io/docs/guides/pricing-paygo) |
| Video: Gemini Omni 1.1 Flash 720p | ≈$0.10/s | [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| GPU: RunPod RTX 5090 Community | $0.69/hr, billed per second. Network volume $0.07/GB-month | [RunPod 5090](https://www.runpod.io/gpu-models/rtx-5090), [RunPod storage](https://docs.runpod.io/pods/storage/types) |
| Self-host throughput: Wan 2.2 A14B, LightX2V distilled (NVFP4, 4 steps) on a 5090 | 26.7 s per 720p image-to-video clip. Clip length is not stated on the card; ~5 s assumed. Excludes model load. Requires a Blackwell GPU | [HF model card](https://huggingface.co/lightx2v/LightWan2.2-A14B) |

### 2.2 Quantity assumptions

**Shot counts per format (my assumptions):**

| Format | S1 (full AI video) / S3 (self-hosted) | S2 (motion comic) |
|---|---|---|
| 45 s reel | 9 shots × 5 s | 12 shots: 2 hero AI clips × 5 s = 10 s of motion, plus 10 stills animated with Ken Burns or parallax (35 s). More cuts keep stills from feeling static |
| 2-minute video | 24 shots × 5 s | 24 shots: 3 hero clips × 6 s = 18 s of motion, plus 21 stills |

**Retry factor:** 1.5× on LLM, images, video and TTS. It is not applied to music, which comes from a reusable library, or to storage.

**Billed AI-video seconds per video:**

| Strategy | 45 s reel | 2-minute video |
|---|---|---|
| S1 | 45 × 1.5 = **67.5 s** | 120 × 1.5 = **180 s** |
| S2 | 10 × 1.5 = **15 s** | 18 × 1.5 = **27 s** |

**Keyframe images per video:**

| Strategy | 45 s reel | 2-minute video |
|---|---|---|
| S1 and S3 | 9 × 1.5 = 13.5 | 24 × 1.5 = 36 |
| S2 | 12 × 1.5 = 18 | 24 × 1.5 = 36 |

**Supporting services, "lean" version** (Batch APIs wherever possible; Batch turnaround can be up to 24 h, per [Gemini Batch](https://ai.google.dev/gemini-api/docs/batch-api)):

| Line | 45 s reel | 2-minute video |
|---|---|---|
| LLM | Sonnet Batch, 15k input / 9k output tokens: 0.015 + 0.045 = $0.06 × 1.5 = **$0.09** | 20k / 14k tokens: 0.02 + 0.07 = $0.09 × 1.5 = **$0.14** |
| TTS | 0.75 min × $0.0135 × 1.5 = **$0.02** | 2 min × $0.0135 × 1.5 = **$0.04** |
| Music | $2.40 library ÷ ~90 videos ≈ **$0.03** in month 1, ~$0 afterwards | **$0.03** |
| Captions | **$0** (WhisperX) | **$0** |
| Storage | **$0.01** | **$0.02** |
| **Subtotal (excluding images and video)** | **$0.15** | **$0.23** |

**Self-hosted GPU (S3), all est.:**
- **Per-video GPU cost:**
  - 45 s reel: 13.5 clips × 26.7 s = 6.0 min. Multiply by 1.5 for 16→30 fps interpolation, upscaling and decoding = 9 min = 0.15 h × $0.69 = **$0.10**.
  - 2-minute video: 36 clips × 26.7 s = 16.0 min × 1.5 = 24 min = 0.4 h × $0.69 = **$0.28**.
- **Fixed monthly cost:**
  - 100 GB volume × $0.07 = $7.00.
  - Daily start-up and model load of 15 min × 30 days = 7.5 h × $0.69 = $5.18.
  - Total ≈ **$12.18/month**.

### 2.3 Cost per video (AI only, lean stack)

| Line | S1, 45 s | S2, 45 s | S3, 45 s | S1, 2 min | S2, 2 min | S3, 2 min |
|---|---|---|---|---|---|---|
| LLM + TTS + music + captions + storage | 0.15 | 0.15 | 0.15 | 0.23 | 0.23 | 0.23 |
| Keyframe images (× $0.02) | 0.27 (13.5) | 0.36 (18) | 0.27 (13.5) | 0.72 (36) | 0.72 (36) | 0.72 (36) |
| **Subtotal before video** | **0.42** | **0.51** | **0.42** | **0.95** | **0.95** | **0.95** |
| Video: Grok 1.5 Lite | 67.5 × 0.03 + 13.5 × 0.01 = **2.16** | 15 × 0.03 + 3 × 0.01 = **0.48** | — | 180 × 0.03 + 36 × 0.01 = **5.76** | 27 × 0.03 + 4.5 × 0.01 = **0.86** | — |
| Video: H3 Max 480p | 67.5 × 0.05 = 3.38 | 15 × 0.05 = 0.75 | — | 180 × 0.05 = 9.00 | 27 × 0.05 = 1.35 | — |
| Video: H3 Max 768p | 67.5 × 0.08 = 5.40 | 15 × 0.08 = 1.20 | — | 180 × 0.08 = 14.40 | 27 × 0.08 = 2.16 | — |
| Video: Omni 1.1 Flash 720p | 6.75 | 1.50 | — | 18.00 | 2.70 | — |
| Video: self-hosted GPU (variable) | — | — | 0.10 | — | — | 0.28 |
| **Total with Grok Lite** | **$2.58** | **$0.99** | — | **$6.71** | **$1.81** | — |
| **Total with H3 Max 480p** | $3.80 | $1.26 | — | $9.95 | $2.30 | — |
| **Total with H3 Max 768p** | $5.82 | $1.71 | — | $15.35 | $3.11 | — |
| **Total with Omni 720p** | $7.17 | $2.01 | — | $18.95 | $3.65 | — |
| **Total S3** | — | — | **$0.52 + share of $12.18/month** | — | — | **$1.23 + share of $12.18/month** |

**Adjustments to the table:**
- **Interactive pricing instead of Batch** (needed if you regenerate during review): add **+$0.37** (S1/S3 at 45 s), **+$0.46** (S2 at 45 s) or **+$0.89** (any 2-minute video). That comes from images at $0.04 instead of $0.02, Sonnet standard at $0.18/$0.27 instead of $0.09/$0.14, and TTS at the standard rate.
- **Better narration:** ElevenLabs v4 at list price ($0.08 per 1K characters ≈ $0.08/min; [ElevenLabs](https://elevenlabs.io/pricing/api)) adds +$0.07 per 45 s reel and +$0.20 per 2-minute video. The launch promo ends Oct 12, so plan at list price. Cartesia Pro is a flat **$5/month for about 133 min** with word timestamps ([Cartesia](https://www.cartesia.ai/pricing)). That covers 90 reels × 0.75 min × 1.5 = 101 min.

### 2.4 Monthly totals for ONE niche (AI only)

| Strategy and video model | 45 s × 60/month (2/day) | 45 s × 90/month (3/day) | 2 min × 60 | 2 min × 90 | Videos per $100 (45 s / 2 min) |
|---|---|---|---|---|---|
| S1, Grok 1.5 Lite | $155 | $232 | $403 | $604 | 38 / 14 |
| S1, H3 Max 480p | $228 | $342 | $597 | $896 | 26 / 10 |
| S1, H3 Max 768p | $349 | $524 | $921 | $1,382 | 17 / 6 |
| S1, Omni 720p | $430 | $645 | $1,137 | $1,706 | 13 / 5 |
| **S2, Grok 1.5 Lite** | **$59** | **$89** | $109 | $163 | 101 / 55 |
| **S2, H3 Max 480p** | **$76** | $113 | $138 | $207 | 79 / 43 |
| S2, H3 Max 768p | $103 | $154 | $187 | $280 | 58 / 32 |
| S2, Omni 720p | $121 | $181 | $219 | $329 | 49 / 27 |
| S2+ (≈40% of the runtime animated, i.e. 18 s motion per 45 s, on Grok Lite: 27 s × 0.03 + 6 × 0.01 = $0.87 per video, so $1.38 total) | $83 | $124 | — | — | 72 / — |
| **S3, Wan 2.2 distilled on a RunPod 5090** | **$43** | **$59** | **$86** | $123 | 168 / 71 |

**Arithmetic:**
- API strategies: monthly cost = per-video cost × number of videos. For example, S2 with H3 768p: 1.71 × 60 = $102.60.
- S3: monthly cost = per-video variable cost × number of videos + $12.18. For example, S3 at 45 s: 0.52 × 90 + 12.18 = $58.98.
- Videos per $100 = 100 ÷ per-video cost. For S3 it is (100 − 12.18) ÷ variable cost.

**One-time costs:**
- **Bible character library:** 30–50 characters × 6 views on Nano Banana Pro costs **$12–20 on Batch or $24–40 standard** ([Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)). This niche has a large cast, unlike the single kitten character.
- **Music library:** $2.40 per niche.
- **Model bake-off:** about 50 clips × 5 s at $0.03–0.10/s ≈ **$10–25** (est.).
- **S3 only:** one character or style LoRA per niche, a few GPU-hours on the 5090 ≈ $2–5 (est.).

### 2.5 What fits under $100/month, and what you give up

**Fits for one niche:**
- S2 45 s with Grok Lite hero clips at 2–3/day ($59–89).
- S2 45 s with H3 Max 480p at 2/day ($76).
- S2+ (40% motion) on Grok Lite at 2/day ($83).
- S3 45 s at 2–3/day ($43–59).
- S3 2-minute at 2/day ($86).
- A mix at 2/day: 40 × S2 45 s on H3 480p ($50.40) plus 20 × S2 2-minute on Grok Lite ($36.20) = **$86.60**.

**Borderline:**
- S2 45 s on H3 Max 768p: $103 at 2/day. It fits at ≤58 videos/month.

**Does not fit:**
- **S1 at any quality.** The cheapest S1 plan buys only ~38 reels a month (1.3/day), on a model with no reference inputs and unproven quality.
- Any 2-minute plan at 3/day except S3, which is borderline at $123.

**What you give up with each strategy:**
- **S2 (motion comic):**
  - Most of the screen time is a still image with camera motion. That suits illustrated biographies, is acceptable for Bible stories, and is weakest for kittens, whose appeal is the motion.
  - Policy exposure: YouTube's exclusion targets "image slideshows… with minimal or no narrative" ([YouTube policy](https://support.google.com/youtube/answer/1311392?hl=en)). A strong narrated story arc, varied series formats and 2–3 hero clips make the format defensible, but there is no guarantee.
  - The publishing researcher suggests animating 30–60% of shots. Only S2+ on Grok Lite reaches that within budget at 2/day.
- **S3 (self-hosted):**
  - Every shot moves, but quality is open-weights class (LTX-2.5 Fast scores 1038 against H3 Max at 1195; distilled Wan 2.2 is not ranked).
  - Native output is 16 fps and needs interpolation.
  - NVFP4 needs Blackwell GPUs.
  - You own cold starts and 35–60 GB model weights.
  - The throughput figures exclude model load, and my overhead factors are estimates.
  - Phase-2 hybrid: all shots on S3 plus one H3 768p hero clip (7.5 s × $0.08 = $0.60) ≈ $1.12 per video, about **$79/month at 2/day**.
- **Grok Lite as the floor:** it has no references and no first/last frame, so character consistency depends entirely on your keyframes. Its quality is unverified, and xAI bills policy violations.

### 2.6 Costs outside AI, and more than one niche

**Fixed costs outside AI:**
- VPS €6–15 ([Contabo](https://contabo.com/en/vps/)).
- Upload-Post Basic $16/month billed annually ([Upload-Post](https://www.upload-post.com/pricing)).
- Workflow engine $0 (Inngest Free) to about $1–7 (Temporal Cloud) ([Inngest](https://www.inngest.com/pricing), [Temporal](https://temporal.io/pricing)).
- R2 mostly within the free tier.
- Total roughly **$25–40/month** (EUR/USD conversion approximate).
- If the $100 includes these, the AI budget drops to about $60–75. Then only S2 on Grok Lite (2–3/day) or S3 at 45 s fits.

**More than one niche:**
- The budget is a total across niches, so each niche adds its full cost.
- Two niches on S2 45 s with H3 480p at 2/day cost $151, which is over budget.
- With three niches on APIs, ~$33 per niche buys about 33 S2 Grok-Lite reels per niche per month (~1/day).
- S3 shares one fixed GPU cost across niches: (100 − 12.18) ÷ 0.52 ≈ 168 reels/month, or about 56 per niche (≈1.9/day). **S3 is the only route to 3 niches at ~2/day under $100.**

**Price changes already factored in:**
- Gemini 3.x Flash and Flash TTS prices double on 2027-01-01. TTS above is already planned at the 2027 rate ([Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)).

---

## 3. Recommended model stack per niche style

### 3a. Bible / Catholic stories (cinematic realistic)

| Layer | Primary | Fallback | Notes |
|---|---|---|---|
| Video, hero shots | **MiniMax H3 Max 768p**, image-to-video from keyframes, $0.08/s ([MiniMax](https://platform.minimax.io/docs/guides/pricing-paygo)) | **Gemini Omni 1.1 Flash** at ≈$0.10/s; draft at 360p for $0.034/s on Runway ([Gemini](https://ai.google.dev/gemini-api/docs/pricing), [Runway](https://docs.dev.runwayml.com/guides/pricing/)). **Wan 3.0** at $0.10/s for 15–30 s takes | Avoid Seedance: it rejects real-face references ([PR](https://github.com/Comfy-Org/ComfyUI_frontend/pull/19638)). Avoid Veo on the Gemini API (shuts down Oct 22). Omni rejects uploads of recognizable people, so don't imitate actors from shows such as *The Chosen* |
| Video, bulk / floor | H3 Max 480p, $0.05/s | Grok 1.5 Lite, $0.03/s plus $0.01 per image ([xAI](https://docs.x.ai/developers/pricing)) | All other shots use Ken Burns or parallax. Run an LLM policy pre-check before calling xAI |
| Character sheets | **Nano Banana Pro**, $0.134 ($0.067 Batch); 5 character + 3 style references ([pricing](https://ai.google.dev/gemini-api/docs/pricing), [references](https://ai.google.dev/gemini-api/docs/image-generation)) | Seedream 5.0 Pro "from $0.045" (new-user offer; list price unverified) ([BytePlus](https://www.byteplus.com/en/product/Seedream)); Qwen-Image-Edit-2511 (Apache-2.0, self-hostable) ([HF](https://huggingface.co/Qwen/Qwen-Image-Edit-2511)) | Build one library for the recurring cast (Jesus, Mary, apostles, patriarchs) |
| Keyframes | **Nano Banana 2.1**, $0.0336 ($0.0168 Batch), ≤4 character references [NEW, GA Oct 6] | FLUX.2 [pro] from $0.03 ([BFL](https://docs.bfl.ai/quick_start/pricing)) | OpenAI says gpt-image-2.5 "may occasionally struggle to maintain visual consistency for recurring characters" ([OpenAI](https://developers.openai.com/api/docs/guides/image-generation)) |
| Narration (TTS) | **Gemini 3.8 Flash TTS**, $0.0135/min, rising to $0.027/min in 2027, plus WhisperX for word timing [NEW, Sep 22] | Cartesia Pro $5/month (~133 min, word timestamps) or ElevenLabs v4 (list $0.08 per 1K characters; Creator plan $22/month) | A/B test the narrator in week 1. Don't voice Jesus as a first-person impersonation unless you have decided to |
| Music | **Lyria 3.5** instrumental library, $0.08/song ([Gemini](https://ai.google.dev/gemini-api/docs/pricing)) | YouTube Audio Library (treat standard-license tracks as YouTube-only); Pixabay, excluding tracks marked "Content ID Registered"; Stable Audio 3.0 at $0.26 per generation ([Stability](https://platform.stability.ai/pricing)) | **Do not use ElevenLabs Music**: its terms bar "religious organizations or institutions" ([terms](https://elevenlabs.io/music-terms)) |
| LLM | **Claude Sonnet 5.5** ($2/$10; Batch $1/$5) for script and shot list, grounded in a local public-domain Bible: WEB, the WEB Catholic edition (WEBC), Douay-Rheims and the Berean Standard Bible (BSB) | Gemini 3.8 Flash ($0.75/$3.75, rising to $1.50/$7.50 in 2027). Claude Haiku 5.5 ($0.10/$0.50 for prompts ≤100k tokens; 5× more above that) for prompt expansion and policy pre-checks | **Avoid NIV** ([Biblica](https://www.biblica.com/permissions/)). ESV only within its limits ([Crossway](https://www.crossway.org/permissions/)). The API.Bible FAQ of Oct 1 forbids sending copyrighted text to LLMs or TTS [NEW] ([FAQ](https://care.api.bible/article/405-express-licensing-faqs)). WEB and WEBC are public domain, but "World English Bible" is a trademark ([eBible](https://ebible.org/eng-web/copyright.htm)). BSB is public domain ([BSB](https://berean.bible/terms.htm)) but has 66 books only |

### 3b. 3D Pixar-style kittens

| Layer | Primary | Fallback | Notes |
|---|---|---|---|
| Video, hero shots | **Kling O3 Standard** reference-to-video with elements, $0.084/s silent on fal ([fal](https://fal.ai/models/fal-ai/kling-video/o3/standard/reference-to-video)) | H3 Max reference mode (≤9 images; 2 free, then $0.074 each); Grok Imagine 1.5 ($0.14/s at 720p; ≤14 references) | Animals avoid the face and minor filters; consistency is the main problem. Check whether Kling 4.0 reaches the API |
| Video, bulk | Grok 1.5 Lite image-to-video $0.03/s, or PixVerse V6 $0.045/s ([fal](https://fal.ai/pixverse-v6)) | **Phase 2: self-hosted Wan 2.2 or LTX with a character LoRA (S3).** This is the best niche for S3, because one recurring character makes the LoRA pay off | Motion is the appeal here, so S2 suits this niche worst |
| Images | Nano Banana Pro for the character sheet (style references); Nano Banana 2.1 for keyframes | FLUX.2 [pro]; Qwen-Image-Edit-2511 | |
| Narration (TTS) | Optional: Gemini 3.8 Flash TTS | ElevenLabs v4 for character voices | |
| Music / SFX | Lyria 3.5, or ElevenLabs Music at $0.15/min (allowed for this niche; Free–Pro plans are for individual use; no building a music library to resell). ElevenLabs SFX at $0.12/min ([ElevenLabs](https://elevenlabs.io/pricing/api)) | Stable Audio | |
| LLM | Claude Haiku 5.5 or Gemini 3.8 Flash for plot generation, with rules that force variety | Sonnet 5.5 for multi-episode series arcs | YouTube treats "animals in exaggerated distress" and "same situation… same outcome" as non-monetizable ([policy](https://support.google.com/youtube/answer/1311392?hl=en)). Also decide the made-for-kids setting |

### 3c. Illustrated biographies

| Layer | Primary | Fallback | Notes |
|---|---|---|---|
| Video | Mostly S2: parallax or Ken Burns. Hero clips are low-motion image-to-video on H3 Max 480p ($0.05/s) | PixVerse V6 $0.045/s; Grok Lite $0.03/s; later Wan 2.2 or LTX with a style LoRA | The main risk is motion drifting toward photorealism, so keep motion prompts minimal |
| Images | Nano Banana Pro with 3 style references for painterly consistency; Nano Banana 2.1 for volume | Ideogram 4.0 ($0.03–0.10) for titles with text ([Ideogram](https://ideogram.ai/pricing/?pricing_tab=api)); FLUX 3 Image $0.048 at 1k [NEW, Oct 1] ([BFL](https://docs.bfl.ai/quick_start/pricing)) | Nano Banana 2.1 search grounding does not support real-world images of people ([docs](https://ai.google.dev/gemini-api/docs/image-generation)) |
| Narration (TTS) | ElevenLabs v4 or Gemini 3.8 Flash TTS | Cartesia | Never clone a real person's voice |
| Music | Lyria 3.5 or ElevenLabs Music | Stable Audio | |
| LLM | Sonnet 5.5 plus web search ($10 per 1,000 searches), with a fact-check pass that cites sources | Gemini 3.8 Flash plus Google grounding (5,000 free per month, then $14 per 1,000) ([Gemini](https://ai.google.dev/gemini-api/docs/pricing)) | AI disclosure is required on YouTube when a real person "appear[s] to say or do something they didn't" ([YouTube](https://support.google.com/youtube/answer/14328491?hl=en)) |

---

## 4. Publishing

### 4.1 Per-platform path

| Platform | Path now | Key API facts | Approval hurdle and timeline | Scheduling | AI flag |
|---|---|---|---|---|---|
| **Facebook Page Reels** | Aggregator on day 1. Add your own Meta app adapter in weeks 1–2 | Graph API v26 `video_reels`. Reels must be **3–90 s**. Limit of **30 API-published reels per 24 h per Page**. Videos over 90 s go through `/videos` ([Reels guide](https://developers.facebook.com/docs/video-api/guides/reels-publishing), [/videos](https://developers.facebook.com/docs/graph-api/reference/page/videos/)) | Standard Access is granted automatically, with no App Review, for people who have a role on the app ([access levels](https://developers.facebook.com/docs/graph-api/overview/access-levels/)). **Unresolved:** posts from an app in Development mode are visible only to app roles ([app modes](https://developers.facebook.com/docs/development/build-and-test/app-modes)), and Business-type apps use access levels instead of modes. Test on a test Page that a non-role account can see the post | `/videos`: `scheduled_publish_time` 10 min–6 months ahead. `video_reels`: the SCHEDULED window is undocumented (the "10 min–29 days" figure is 3p, and the original citation was wrong) **(corrected)**. Use your own queue | `is_ai_generated` on `video_reels`; not listed on `/videos` |
| **Instagram Reels** | Same Meta app | 3 s–15 min, ≤300 MB. Containers **expire after 24 h**; 400 containers per 24 h. The publishing limit is stated as 100 posts per 24 h in one place and 50 in another on the same page; check `content_publishing_limit` ([IG media](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media), [publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing)) | Standard Access is enough for your own professional account ([IG overview](https://developers.facebook.com/docs/instagram-platform/overview)) | **No native scheduling.** Create the container shortly before publishing | `is_ai_generated`. `trial_params` lets you test hooks on non-followers first |
| **YouTube Shorts** | Aggregator until your Google Cloud project passes the audit | `videos.insert`: **100 calls/day per project at 1 unit** (separate quota bucket since 2026-06-01). Vertical or square videos up to 3 minutes count as Shorts ([insert](https://developers.google.com/youtube/v3/docs/videos/insert), [revision history](https://developers.google.com/youtube/v3/revision_history), [Shorts](https://support.google.com/youtube/answer/15424877?hl=en)) | **Uploads stay private until the project passes a compliance audit.** Reported to take "a few weeks" (3p); approval of a personal tool is uncertain. An OAuth consent screen left in "Testing" gives **7-day refresh tokens**; switch it to Production, which shows an unverified-app warning and caps new users at 100 ([Google Cloud help](https://support.google.com/cloud/answer/15549945?hl=en)) **(corrected source)** | `status.publishAt` (only while the video is private) | `status.containsSyntheticMedia`. Also set `selfDeclaredMadeForKids` |
| **TikTok** | **Aggregator permanently**, or manual posting in TikTok Studio | About 15 Direct Posts per day per creator, shared across all API clients; 6 requests/min per user token. `is_aigc` [NEW] ([Direct Post reference](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)) | An unaudited app can only post `SELF_ONLY`, the target accounts must be private, and at most 5 users can post per 24 h. The guidelines say "Not acceptable: A utility tool to help upload contents to the account(s) you or your team manages" ([guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines)). An audit is very likely to fail | No scheduling in the API | `is_aigc=true` |

**Aggregators:**

| Option | Price | Coverage | Notes |
|---|---|---|---|
| **Upload-Post Basic** | **$16/month billed annually ($192/year); $24 month-to-month** | Unlimited uploads. **5 profiles, where 1 profile = 1 account per platform**, so one profile per niche. TikTok included on paid plans. FFmpeg API 300 min/month | ([pricing](https://www.upload-post.com/pricing), [comparison](https://www.upload-post.com/pricing-comparison)). The tech-stack report quoted the $33 Professional plan; **Basic is enough (corrected)**. A social account can be linked to only one Upload-Post account at a time |
| Zernio | About $12/month for 1 niche (4 accounts); about $54 for 3 niches | — | ([pricing](https://zernio.com/pricing)) |
| Postiz Cloud | $29 / $39 / $49 per month | — | ([pricing](https://postiz.com/pricing)) |
| Ayrshare | $149/month | — | Over budget |
| Metricool API | $53+/month (annual) | — | Over budget |

- Self-hosted Postiz does **not** get around the TikTok or YouTube audits.
- **Open item:** confirm that the aggregator's API passes `is_aigc`, `containsSyntheticMedia` and `is_ai_generated`. The reports did not verify this.

**Suggested timeline:**
- **Week 0–1:**
  - Create the accounts for niche 1 and connect Upload-Post.
  - Build and test the direct Meta adapter (visibility to a non-role account).
  - Move the YouTube OAuth consent screen to Production and submit the audit form.
- **Weeks 1–4:** 1 post/day per platform. This ramp is the publishing researcher's advice; there is no official warm-up guidance (verifier: unverifiable).
- **Weeks 3–8:** expect the YouTube audit outcome. Approval is uncertain.
- **YouTube Partner Program (YPP):**
  - Threshold: 1,000 subscribers plus 4,000 watch hours in 12 months, or **10M Shorts views in 90 days**. Review takes about 1 month.
  - **New YPP terms take effect 2027-02-01 and must be accepted by 2027-01-31** ([YPP](https://support.google.com/youtube/answer/72851?hl=en)).

### 4.2 Scheduling approach

- **Own queue as the source of truth.** Keep the schedule in your own Postgres queue, driven by workflow timers. Native scheduling is only a convenience where it exists (Facebook `/videos`, YouTube `publishAt`).
- **Instagram timing.** Create Instagram containers within 24 h of publishing.
- **Rate guards per account:**
  - Facebook: 30 reels per Page per day.
  - Instagram: 50–100 posts per day.
  - YouTube: 100 uploads per project per day, shared by all channels in that Google Cloud project.
  - TikTok: about 15 posts per day.
- **Facebook routing by length:** 90 s or less goes to `video_reels`; 91–180 s goes to `/videos`.
- **Media hosting.** Serve media from an R2 bucket on **your own custom domain**:
  - TikTok `PULL_FROM_URL` requires a domain verified in your TikTok developer account.
  - Meta must be able to fetch the file with the `facebookexternalhit` user agent.
  - Meta rejects fbcdn URLs.
- **Post time.** Schedule in US prime time (my judgment). Your local time in Vietnam is UTC+7.

### 4.3 AI-disclosure handling

**Recommendation: turn the AI flag ON for every video on every platform.**
- **Meta** requires an AI label for "a reel narrated with a realistic AI-generated voiceover" ([Meta Help](https://www.meta.com/en-gb/help/artificial-intelligence/1783222608822690/)). Every TTS-narrated video qualifies.
- **YouTube** requires disclosure for:
  - realistic scenes that didn't happen;
  - "AI generated music" (verifier: the example list names it plainly, not only when it is the main focus);
  - real people shown saying or doing things they didn't.

  YouTube says disclosure "won't limit a video's audience or impact its eligibility to earn money" ([YouTube](https://support.google.com/youtube/answer/14328491?hl=en)).
- **Automatic labels anyway.** Google outputs (Veo, Omni, Gemini images, Lyria) carry SynthID, and Kling embeds C2PA metadata, so platforms may auto-label regardless.
- **Instagram "AI-generated profile" label** [NEW, Aug 31]. This matters only if a niche uses a recurring AI-generated host persona ([9to5Google](https://9to5google.com/2026/08/31/instagram-ai-generated-influencers-label-update/)).

### 4.4 Monetization and policy risks for mass-produced AI content

**Where money can come from:**

| Program | Status for a Vietnam-based creator | Source |
|---|---|---|
| YouTube YPP | **Vietnam is eligible** | [YPP availability](https://support.google.com/youtube/answer/7101720?hl=en) |
| Facebook Content Monetization | Invite-only; 70 countries; **Vietnam is not listed** (confirmed on Meta's page; older copies of the list that include Vietnam are stale) | [Meta](https://www.facebook.com/business/help/267128784014981), [Meta](https://www.facebook.com/business/help/1049081556813520) |
| TikTok Creator Rewards | Only 8 countries; the creator must be based there; videos must be over 1 minute (thresholds medium confidence) | [TikTok](https://www.tiktok.com/creator-academy/article/creator-rewards-program) |

Do not fake residency.

**Policy risks:**
- **YouTube restructured its monetization policy on Jul 13–16, 2026** [NEW] into three non-monetizable categories (the verifier corrected the original description):
  - **"Generic or Repetitive Content"**, which includes "image slideshows, templated storylines…" and "AI-generated content made with generic or unoriginal templates giving the impression of mass production."
  - **"Unsatisfying or Off-putting Content"**, which includes "stitch together unrelated or inconsistent AI clips" and emotionally manipulative formulas.
  - **"AI Personas Related to Sensitive Topics"**, so don't create an AI "pastor" giving life or health advice.
  - The policy explicitly allows "using AI to visualize a unique character and narrative you invented."
  - Sources: [policy](https://support.google.com/youtube/answer/1311392?hl=en), [TechCrunch](https://techcrunch.com/2026/07/20/youtube-clarifies-policies-around-ai-slop-and-upsetting-videos/).
- **Reused content.** "Content that exclusively features readings of other materials you did not originally create" is excluded, so never publish verbatim scripture readings on their own. Write original narrative and quote scripture inside it.
- **Enforcement precedent.** *Imperio de Jesús*, an AI Jesus channel with 5.87M subscribers, was removed in January 2026. This comes from press reports, not a YouTube statement ([Tubefilter](https://www.tubefilter.com/2026/01/29/youtube-ai-slop-channel-crackdown-bans/)).
- **Facebook originality update (Mar 13, 2026).** Pages that keep posting unoriginal content can be made non-recommendable. "Narrating what's already on screen without adding anything meaningful" counts as unoriginal ([Meta newsroom](https://about.fb.com/news/2026/03/rewarding-original-creators-on-facebook/)). Meta's best practices: no third-party watermarks and ≤5 hashtags ([Meta for Creators](https://creators.facebook.com/blog/combating-unoriginal-content)).
- **Content ID on 2-minute Shorts.** "Any Short that is over one minute… with an active Content ID claim of any type… will be blocked globally" ([YouTube](https://support.google.com/youtube/answer/15424877?hl=en)). Use only music you generated yourself.
- **Made-for-kids risk (kittens).** COPPA status would sharply cut ad revenue (not verified this session). YouTube's kids quality principles name "mass production or autogeneration."
- **Reference format.**
  - Jesus Daily has **31,627,023 followers**. Typical reels get 100–250K views.
  - Captions follow a pattern: a reflective question, a 1–3 sentence story recap, a scripture reference, then a comment CTA.
  - 9 of the 10 reels checked use "Original audio" ([Reels tab](https://www.facebook.com/JesusDaily/reels/)).
  - **The reel URL you gave, facebook.com/reel/1645273697214268, is not from Jesus Daily.** It is a tutorial on AI filmmaking by Vietnamese creator Phạm Công Trúc ([link](https://www.facebook.com/reel/1645273697214268)).

---

## 5. Tech stack

### 5.1 Architecture

**Shape:**
- **A web app, not a desktop app.** Scheduled publishing, OAuth token refresh and provider webhooks all need an always-on public HTTPS host. Make the review UI mobile-friendly (or a PWA) so you can approve videos from your phone. A local-GPU worker that pulls jobs can be added later.
- **A modular monolith deployed as 2 processes from 1 codebase:**
  - `web/api`: review UI, niche configuration, schedule calendar and webhook receivers.
  - `worker`: runs the workflow steps.
  - Run rendering in its own container with a memory limit and concurrency 1–2.
- **Shared services:** Postgres, R2 and a durable workflow engine. No microservices, Kafka or Kubernetes.

**Modules:**
- `niche`: preset for style, default character, voice, caption style, accounts, and auto-approve flags.
- `research` / `script`: the script and shot list as JSON.
- `assets`: character sheets and keyframes, versioned.
- `shots`, `audio`, `render`, `review`, `publish`.
- **`cost-ledger`**:
  - Log each external call's estimated and actual cost.
  - Enforce a **monthly hard cap per niche** and a **budget of AI-motion seconds per video** (verifier recommendation).

**Workflow per video:**
1. Research → script → **script gate** (skipped if the niche is set to auto-approve).
2. Keyframes → per-shot video, run in parallel with a concurrency limit.
   - Each shot can be retried or regenerated on its own.
   - **If a hero clip fails, fall back to Ken Burns on its keyframe.** This also caps retry spend.
3. TTS, music and alignment → render → **final gate**.
4. Schedule → publish → store the returned post IDs.

**Resilience:**
- Use webhooks for job completion (MiniMax `callback_url`, fal webhooks), with polling as a fallback.
- Use idempotency keys of the form `(videoId, shotNo, attempt)`.
- Put a provider-adapter interface on every layer: video, image, TTS, music, LLM and publisher.
- Pin model IDs and keep a deprecation calendar (Appendix A).

### 5.2 If you are strongest in Java

| Concern | Choice | Source |
|---|---|---|
| Framework | Spring Boot 4.1 on Java 25 with virtual threads (JEP 491 removes most pinning cases) | [spring.io](https://spring.io/blog/2026/06/10/spring-boot-4/), [JEP 491](https://openjdk.org/jeps/491) |
| LLM client | Spring AI 2.0.1 [NEW, Aug 21] | [spring.io](https://spring.io/blog/2026/08/21/spring-ai-2-0-1-available-now/) |
| Image and video APIs | Official `ai.fal.client:fal-client`. Replicate has no Java client, so call it via REST | [fal Java](https://fal.ai/docs/api-reference/client-libraries/kotlin) |
| Orchestration, option A | **Temporal** via `temporal-spring-boot-starter` 1.31.0. Temporal Cloud Developer plan: $50 per million actions, no base fee, **plus a 10% support fee**, $150 credit for 90 days. Estimated **~$1–2/month with webhooks or ~$3–7 with polling (corrected)** | [Temporal docs](https://docs.temporal.io/develop/java/integrations/spring-boot-integration), [Temporal pricing](https://docs.temporal.io/cloud/pricing) |
| Orchestration, option B (lighter) | **DBOS Transact Java 1.0** (MIT, Postgres only, no extra server) [NEW, Jul 2026] | [GitHub](https://github.com/dbos-inc/dbos-transact-java) |
| Media | FFmpeg called through ProcessBuilder with a small typed command builder; ASS karaoke captions | — |
| Composition | **A Remotion render sidecar in Node from day 1**, not "later", because S2 depends on good composition | — |
| UI | Next.js, or Thymeleaf + htmx to stay in one language | — |

**Avoid on the Java side:**
- JobRunr OSS: chaining and timeouts are Pro-only, and Pro costs €850 per production cluster per month ([JobRunr](https://www.jobrunr.io/en/pricing/)).
- Spring Batch.

### 5.3 If you are strongest in TypeScript

| Concern | Choice | Source |
|---|---|---|
| Repo layout | pnpm monorepo: `apps/web` (Next.js) and `apps/worker` (Node 22+) | — |
| AI clients | Vercel AI SDK 6 (`generateObject` with Zod schemas), `@fal-ai/client` | [AI SDK 6](https://vercel.com/blog/ai-sdk-6) |
| Orchestration, option A | **Inngest Free**: $0 for 50k executions/month, where executions = runs × (steps + 1). One niche ≈ 90 × 31 ≈ 2.8k. Note that **work pauses when the quota is reached** and trace history lasts only 24 h | [Inngest](https://www.inngest.com/pricing) |
| Orchestration, option B | **Trigger.dev Hobby, $10/month**. Waits over 5 s are not billed. Self-hosting needs about 7 vCPU / 14 GB, which is too heavy | [Trigger.dev](https://trigger.dev/pricing), [self-host docs](https://trigger.dev/docs/self-hosting/docker) |
| Composition | **Remotion**. The Free License covers individuals and companies of up to 3 people and explicitly allows automation; contractors who work on the project count toward the 3 | [pricing](https://www.remotion.dev/docs/license/pricing), [FAQ](https://www.remotion.dev/docs/license/faq) |
| Captions | `@remotion/captions` `createTikTokStyleCaptions()` | — |
| Database | Drizzle | — |

BullMQ Pro, if you ever need it, costs $1,395/year or $139/month **per deployment (corrected)** ([bullmq.io](https://bullmq.io/)).

### 5.4 Which one to choose

- Your proposal of Spring + Next.js already means two languages.
- S2 is the strategy the budget can afford, and **composition quality is what keeps it from looking like a slideshow**: parallax, Ken Burns, animated captions and verse overlays. That makes Remotion core.
- **If you are equally comfortable in both, choose full TypeScript.** Choose Java only if it is clearly your stronger language, and then budget for the Node Remotion sidecar from day 1.

### 5.5 Storage, hosting and reusable open source

**Storage:**
- Postgres, with JSONB for prompts and model parameters.
- Cloudflare R2: $0.015/GB-month, free egress, free tier of 10 GB-month ([R2](https://developers.cloudflare.com/r2/pricing/)).
- A lifecycle rule deletes intermediates after 14–30 days, leaving about 20–60 GB stored (≈$0.15–0.75/month, est.).
- Back up with a nightly `pg_dump` to R2.

**Hosting (monthly):**

| Option | Price | Notes |
|---|---|---|
| **Contabo Cloud VPS 6** (6 vCPU / 12 GB) | **€6.00** effective on a 24-month prepay; ~€7.50 month-to-month. VPS 4 is €4.40 | Contabo says its Core tier is for workloads where "CPU is rarely the bottleneck." **Benchmark rendering on Core against the Performance tier (Cloud VPS Plus 4 at €10.80, Plus 6 at €15.20) before prepaying** ([Contabo VPS](https://contabo.com/en/vps/), [pricing](https://contabo.com/en/pricing/)) |
| Hetzner | CX/CAX plans unavailable [NEW, confirmed on Hetzner's own page]. CPX32 rose to €35.49 on Jun 15 | ([Hetzner](https://www.hetzner.com/cloud/cost-optimized), [price adjustment](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/)) |
| DigitalOcean (4 vCPU / 8 GB) | $48 | ([DO](https://www.digitalocean.com/pricing/droplets)) |
| Oracle Always Free | Cut to **2 OCPU / 12 GB** around June 2026 **(corrected)** | ([Oracle](https://docs.oracle.com/en-us/iaas/Content/FreeTier/resourceref.htm)) |
| GPU for S3: RunPod 5090 | $0.69/hr Community, $0.99/hr Secure. Vast.ai's median for a 5090 is about $0.53/hr **(corrected)** | — |
| GPU for S3: Modal Starter | $30/month of free credit; L40S at $1.95/hr. Multipliers apply: 1.15–1.75× for region selection, 3× for non-preemptible. The L40S is not a Blackwell GPU, so the NVFP4 throughput figure does not apply | ([Modal](https://modal.com/pricing)) |

**Open source to reuse rather than adopt wholesale:**

| Project | License | What to take |
|---|---|---|
| Verticals ([repo](https://github.com/rushindrasinha/youtube-shorts-pipeline)) | MIT | The "niche profile" preset concept |
| ViMax ([repo](https://github.com/HKUDS/ViMax)) | MIT; v1.2.0 Jul 20 | Agent prompts for character extraction, storyboard and best-image selection |
| ArcReel ([repo](https://github.com/ArcReel/ArcReel)) | **AGPL-3.0** | Read its data model only; don't copy its code |
| MoneyPrinterTurbo ([repo](https://github.com/harry0703/MoneyPrinterTurbo)) | MIT; v1.3.8 Oct 3 | Subtitle timing and FFmpeg hardening |
| Pixelle-Video ([repo](https://github.com/ATH-MaaS/Pixelle-Video)) | Apache-2.0 | ComfyUI workflow wrappers for the illustrated niche |
| Remotion `template-tiktok` | — | Caption composition |
| Postiz ([repo](https://github.com/gitroomhq/postiz-app)) | AGPL | Reference for provider integrations |
| short-video-maker | — | Stale: last push June 2025 |
| ShortGPT | — | Stale since **February 2025 (corrected)** |

**n8n:**
- Use it only for a 1–2 week test of whether the content gets views.
- Cloud Starter costs €20/month (annual billing), with 2.5k executions and a **5-minute maximum execution time**. Running bash scripts (FFmpeg) is self-hosted only ([n8n](https://n8n.io/pricing/)).

---

## 6. Top risks and open questions

### 6.1 Top risks, ranked

| # | Risk | Mitigation |
|---|---|---|
| 1 | **Budget versus volume.** S1 does not fit at all. S2 at 2–3/day fits only on the cheapest models. Each extra niche consumes the same budget | Per-niche hard caps in the cost ledger. Ramp at 1/day. Add the S3 worker before adding a niche |
| 2 | **Demonetization or removal on YouTube**, the only payout path. Templated AI content and slideshows are named in policy; there is a precedent channel removal | Original narrative, ≥4 rotating series formats, multi-episode arcs, hero motion, a human script gate, no verbatim-only scripture |
| 3 | **Geography.** No payout from Facebook, Instagram or TikTok from Vietnam | Treat them as funnels and measure YouTube revenue only |
| 4 | **Vendor churn.** Veo on the Gemini API shuts down Oct 22. Sora is gone. Wan 3.0 and Vidu Q4 are still "preview." Promotions end (Appendix A) | Adapter interface, pinned model IDs, two vetted models per layer |
| 5 | **Content filters on Bible scenes:** infants and children (Veo is adults-only for image input), crucifixion violence, Seedance's face filter. xAI bills violations | Test a fixed set of sensitive prompts per model. Run an LLM pre-check. Fall back to stylized keyframes or Ken Burns |
| 6 | **Publishing access:** YouTube's private-only lock until audit, TikTok audit infeasible, Meta app-mode question unresolved | Use an aggregator first. Test Meta in week 1 |
| 7 | **Character consistency across a large Bible cast** | Character library made with Nano Banana Pro; image-to-video from keyframes; LoRA later |
| 8 | **Theological accuracy and translation licensing** | Keep the script gate permanently for Catholic content. Use only public-domain texts (WEB, WEBC, Douay-Rheims, BSB) |
| 9 | **Dependence on a small aggregator vendor** | Use a Publisher interface and keep manual posting as a fallback |
| 10 | **S3 licenses and DevOps.** LTX has a community license with a revenue threshold (3p); MiniMax H3 open weights need a separate license in the US, EU, UK and South Korea; FLUX.2 [dev], F5-TTS and Fish S2 are non-commercial | Use Apache or MIT models (Wan 2.2, Kokoro, Qwen-Image-Edit-2511) for anything self-hosted |
| 11 | **Niche-specific risks:** made-for-kids status for kittens; real people's likeness, voices and disclosure for biographies | Decide the audience setting before launch; start with long-dead, public-domain historical figures |

### 6.2 Questions to ask you

1. **What does the budget cover?** Does "<$100/month total AI cost" include the VPS (€6–15) and the publishing aggregator ($16)? Is it a total across all niches, or per niche?
2. **Is 2–3/day per niche firm?** Would 1/day for the first month (cost ≈$51) be acceptable? What mix of 45 s and 2-minute videos do you want?
3. **Is the motion-comic look (S2) acceptable** for the Bible niche? Can we show you an A/B sample of S2, S2+ and S3 before deciding?
4. **Do you own an NVIDIA GPU** (for example an RTX 4090 or 5090)? A local GPU would make S3 almost free.
5. **Which language are you stronger in, Java or TypeScript?** Are you comfortable with React/Remotion for the video templates?
6. **Monetization:** do you accept that only YouTube pays from Vietnam, and that Facebook, Instagram and TikTok are reach only?
7. **Catholic specifics:** which translation(s) do you want (WEBC and Douay-Rheims are free)? Who reviews theology? Should Jesus speak in first person?
8. **Which reel did you mean as the reference?** The URL you sent is a Vietnamese creator's AI-filmmaking tutorial, not a Jesus Daily reel. Could you also watch 5–10 Jesus Daily reels while logged in and note duration, shot count, caption style and voice?
9. **Accounts:** do you already have aged Pages or channels per niche, or will they all be new?
10. **Uploaded character images:** will they ever show real people (filters, consent), or only AI-generated characters?
11. **Kittens:** narrated or music-only? Will you set it as made-for-kids?
12. **Biographies:** which people (historical public domain, recently deceased, or living)?
13. **Review latency:** is a turnaround of up to 24 h acceptable for first-pass generation? Batch pricing halves image and LLM costs.
14. **Payments:** can you pay xAI, MiniMax, fal and Google with a Vietnamese card? Some vendors, such as BytePlus, limit availability by region.

---

## Appendix A: Deadline calendar (re-check before building)

| Date | Event | Source |
|---|---|---|
| 2026-10-12 | ElevenLabs v4 promotional price ends; list price is $0.08 per 1K characters | [ElevenLabs](https://elevenlabs.io/pricing/api) |
| 2026-10-22 | Veo 3.1, Fast and Lite preview models and `gemini-omni-flash-preview` shut down on the Gemini API | [deprecations](https://ai.google.dev/gemini-api/docs/deprecations) |
| October 2026 (no date) | Kling 4.0 full model; the API is "coming soon" | [Pandaily](https://pandaily.com/kling-ai-kling-4-0-30-second-native-video-multi-reference-control) |
| 2026-11-17 | Gemini TTS preview models shut down. Vertex `veo-3.1-generate-001` retires "Nov 17, 2026 or later" | [deprecations](https://ai.google.dev/gemini-api/docs/deprecations), [Vertex](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/veo/3-1-generate) |
| 2026-11-30 | Vidu Q4 30% discount ends | [GlobeNewswire](https://www.globenewswire.com/news-release/2026/10/07/3376813/0/en/shengshu-technology-launches-vidu-q4-preview-a-next-generation-ai-video-model-built-for-lifelike-performances.html) |
| 2027-01-01 | Gemini 3.6/3.7/3.8 Flash and 3.8 Flash TTS prices double | [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| 2027-01-31 | Deadline to accept the new YPP terms (effective 2027-02-01) | [YPP](https://support.google.com/youtube/answer/72851?hl=en) |
| 2027-02-26 | OpenAI `whisper-1`, `gpt-4o-transcribe` and `gpt-4o-mini-transcribe` shut down | [OpenAI changelog](https://developers.openai.com/api/docs/changelog) |

## Appendix B: Other changes in the last ~3 months not covered above

- **2026-07-31 — MiniMax H3** released ([HF](https://huggingface.co/MiniMaxAI/MiniMax-H3)).
- **Aug 20 — MiniMax Music API** closed to new users ([MiniMax](https://platform.minimax.io/docs/guides/pricing-paygo)).
- **Aug 4 and Aug 24 — TikTok's posting docs** updated, including `is_aigc`.
- **Aug 13 — Biblica** added an AI clause to its permissions page ([Biblica](https://www.biblica.com/permissions/)).
- **Aug 13 — Contabo** restructured its VPS line-up.
- **Sep 2 — Gemini 3.8 Flash** released.
- **Sep 8 — gpt-image-2.5** released. It now has a Batch price, about $0.0066 per medium-quality image (3p estimate) ([OpenAI pricing](https://developers.openai.com/api/docs/pricing)).
- **Sep 15 — YouTube Quota Calculator** updated. Its auto-generated summary still says 1,600 units per upload; ignore that.