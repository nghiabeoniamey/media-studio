## AI video generation APIs as of 2026-10-09: a buyer's guide for Media Studio

### Scope and method
- **What I read directly:** official vendor pages (Google, Alibaba, MiniMax, xAI, LTX, Runway, Luma, fal, RunPod, Hugging Face model cards). I pulled them with TinyFish fetch. WebFetch was not used.
- **Where I relied on third parties:** some numbers only exist on third-party sites: Kling's official per-second rates (kling.ai/dev/pricing returned an empty page), Seedance's BytePlus token-to-second conversions, Vidu's credit tables and some latency figures. Each such number is marked as third-party and given lower confidence.
- **Price conventions:** all prices are list price in USD per second of output, at the rate charged for 16:9 or 9:16.

---

### 1. Summary
1. **This budget cannot pay for 2–3 fully animated videos a day.**
   - Assume 60–90 videos a month, about 40 s of AI motion each, and about 1.5× extra generations for retries. That is 3,600–5,400 billed seconds a month.
   - Even the cheapest credible model ($0.02–0.03/s) costs $72–162 a month for that, before LLM, TTS, image and music costs.
   - **What works:** a hybrid format with 2–3 AI motion shots per video and animated stills (Ken Burns or parallax) for the rest. Alternatively, a self-hosted open-weights worker later on (section 7).
2. **Best quality per dollar right now: MiniMax H3 Max.**
   - Ranked #1 on Artificial Analysis image-to-video (Elo 1195).
   - Official price $0.05/s at 480p and $0.08/s at 768p. Supports 9:16. Clips are 5–15 s. Accepts up to 9 reference images.
3. **Cheapest usable options at 720p:**
   - Grok Imagine Video 1.5 Lite: $0.03/s ($0.02 at 480p). New around Oct 1.
   - Veo 3.1 Lite: $0.05/s with audio on the Gemini API, or $0.03/s video-only on Vertex.
   - LTX-2.3 Fast API: $0.03/s.
   - Agnes Video 2.5: $0.025/s. Small vendor, low confidence.
4. **Best for realistic hero shots:**
   - **Gemini Omni 1.1 Flash:** about $0.10/s at 720p, $0.034/s at 360p for drafts. #1 on the leaderboard that rates video without audio. This matters because the pipeline replaces model audio with its own TTS and music.
   - **Wan 3.0:** $0.10/s at 720p, clips up to 30 s.
   - **Seedance 2.5:** top quality, but 5–15× more expensive. It also rejects reference images that contain realistic human faces, which is risky for photoreal Bible characters.
5. **Kling 4.0 has no API yet.**
   - Announced Sep 28. Only Kling 4.0 Flash is out, in early access for Ultra Yearly subscribers in the consumer app. The full model is due "in October" with no date given.
   - No API pricing has been published.
   - Kling 3.0 / O3 are available through fal from $0.084/s (silent, Standard). Kling's direct API is sold in prepaid packages starting at $700, so it does not fit this budget.
6. **Sora 2 is gone.** The app closed Apr 26, 2026 and the API closed Sep 24, 2026, with no replacement named.
7. **Self-hosting:**
   - At 60–90 clips a month (about 500–800 s), APIs cost only $15–40, so self-hosting is not worth the engineering time.
   - At 3,000+ s a month, a rented RTX 5090 ($0.69–0.99/hr) running LTX-2.5 or Wan 2.2 distilled costs roughly $20–40 a month all-in, against $100–500 on APIs. But open-weights quality is lower: LTX-2.5 Fast sits at Elo 1038, about the level of Kling 3.0 Omni Standard.

---

### 2. Changes in the last 3 months (Jul 9 – Oct 9, 2026)
| Date | Change | Source |
|---|---|---|
| Jul 31 | Seedance 2.5 released: up to 30 s clips, up to 50 reference inputs | https://magichour.ai/blog/ai-video-model-release-tracker-2026 |
| Jul 31 / Aug 2–3 | MiniMax H3 released; open weights (H3-Base only) published Aug 2–3 | https://huggingface.co/MiniMaxAI/MiniMax-H3 |
| Aug 2026 | MiniMax H3 Max (post-trained by fal) released; now #1 on the image-to-video leaderboard | https://artificialanalysis.ai/video/leaderboard/image-to-video |
| Aug 5 | MAGI-2 Preview (Sand.ai) released as open weights: 114B MoE, Apache 2.0, 10 s clips | https://huggingface.co/sand-ai/MAGI-2-preview |
| Aug 6 / Aug 24 | Wan 3.0 entered public beta Aug 6 and launched Aug 24; Wan 3.0 Prime listed around Aug 24–28 | https://dataconomy.com/2026/08/24/alibaba-launches-wan30-a-30-second-ai-video-generation-model/ |
| Aug 11 | LTX-2.5 released as open weights; API Fast tier $0.09/s at 720p | https://docs.ltx.video/pricing |
| Aug 20 | MiniMax paid Music API closed to new users (affects music-pipeline options) | https://platform.minimax.io/docs/guides/pricing-paygo |
| Aug 27 | Gemini Omni 1.1 Flash generally available; the preview model was due to shut down Sep 30 (third-party report) | https://www.developersdigest.tech/blog/gemini-omni-1-1-flash-release-guide-2026 |
| Sep 17 | HiDream-O1-Video announced (hosted only) | https://www.media-outreach.com/news/china/2026/09/17/488140/ |
| Sep 24 | Sora 2 API shut down | https://techjacksolutions.com/ai-brief/openai-videos-api-sora-2-deprecated-september-2026/ |
| Sep 28 | Kling 4.0 announced; Kling 4.0 Flash in limited early access | https://pandaily.com/kling-ai-kling-4-0-30-second-native-video-multi-reference-control |
| ~Oct 1 | Grok Imagine Video 1.5 Lite launched, from $0.02/s | https://docs.x.ai/developers/pricing |
| Oct 7 | Vidu Q4 Preview released (API model ID `viduq4-preview`) | https://www.unite.ai/vidu-releases-q4-preview-of-next-generation-flagship-ai-video-model/ |

Earlier changes still worth knowing:
- Veo 3.1 Lite launched Mar 31, and Veo 3.1 Fast dropped from $0.15/s to $0.10/s at 720p on Apr 7 (https://the-decoder.com/googles-veo-3-1-lite-cuts-video-generation-costs-by-more-than-half/).
- Kling 3.0 Turbo launched Jun 17 (https://www.atlascloud.ai/blog/tips/kling-3.0-turbo-kling-omni).
- Vertex lists the GA Veo 3.1 model (`veo-3.1-generate-001`) with a retirement date of "November 17, 2026 or later" (https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/veo/3-1-generate). Pin model IDs and plan for migration.

---

### 3. Price and spec matrix (USD per output second)
| Model | Released | 480p | 720p | 1080p | Audio | Max clip | 9:16 | API routes |
|---|---|---|---|---|---|---|---|---|
| **MiniMax H3 Max** | Aug 2026 | $0.05 | $0.08 (768p) | n/a | native | 5–15 s | yes (image-to-video follows the input image's ratio) | MiniMax, fal, Runway ([pricing](https://platform.minimax.io/docs/guides/pricing-paygo), [API](https://platform.minimax.io/docs/api-reference/video-generation-v2-create)) |
| MiniMax H3 | Jul 31 2026 | n/a | $0.08 (768p) | $0.13 (2K) | native stereo | 4–15 s | yes | MiniMax, Runway (`hailuo3`) |
| Hailuo 02 / 2.3 (legacy) | 2025 | 512p: $0.10 per 6 s (≈$0.017/s) | 768p: $0.28 per 6 s (≈$0.047/s); 2.3 Fast $0.19 per 6 s | $0.49 per 6 s | none | 6 / 10 s | yes | MiniMax, fal |
| **Gemini Omni 1.1 Flash** | GA Aug 27 2026 | 360p ≈ $0.034 | ≈ $0.10 | ≈ $0.152 (upscaled) | always on | about 10 s per generation, extendable +10 s up to 40 s | yes (9:16 or 16:9 only) | Gemini API paid tier only, Runway ([pricing](https://ai.google.dev/gemini-api/docs/pricing), [docs](https://ai.google.dev/gemini-api/docs/omni)) |
| **Veo 3.1 Lite** | Mar 31 2026 | n/a | $0.05 with audio (Gemini API); $0.03 video-only (Vertex) | $0.08 / $0.05 | audio always on in Gemini API | 4/6/8 s | yes | Gemini API, Vertex ([Vertex pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing)) |
| Veo 3.1 Fast | Oct 2025 (price cut Apr 7, 2026) | n/a | $0.10 with audio / $0.08 silent (Vertex) | $0.12 / $0.10 | yes | 4/6/8 s | yes | Gemini API, Vertex, Runway |
| Veo 3.1 Standard | Oct 2025 | n/a | $0.40 with audio / $0.20 silent | $0.40 / $0.20 | yes | 8 s with references or at 1080p | yes | same as above |
| **Wan 3.0** | Aug 24 2026 (preview status in docs) | $0.05 | $0.10 | $0.20 | native | 2–30 s | yes | Alibaba Model Studio (Singapore/US regions), Runway, fal, OpenRouter ([blog](https://www.alibabacloud.com/blog/wan3-0-30-second-ai-video-generation-from-any-input_603452)). Pricing docs reportedly show a limited-time 30% discount (≈$0.041 / $0.083 / $0.165). |
| Wan 3.0 Prime (faster variant) | late Aug 2026 | ≈$0.064–0.075 | ≈$0.127–0.15 | ≈$0.254–0.30 | native | 2–30 s | yes | Model Studio, Runway, WaveSpeed ([WaveSpeed](https://wavespeed.ai/models/alibaba/wan-3.0-prime/image-to-video)) |
| Wan 2.2 A14B (open weights) | Jul 2025 | fal $0.04 | fal $0.08 | n/a | none | ~5 s (81 frames at 16 fps) | yes | fal, self-host ([fal](https://fal.ai/models/fal-ai/wan/v2.2-a14b/image-to-video)) |
| **Kling 3.0 Std / O3 Std** | Feb 5 2026 | n/a | fal: $0.084 silent; $0.112 (O3) or $0.126 (V3) with audio | Pro on fal: $0.112 / $0.168. Official (third-party copy): 720p $0.084/$0.112, 1080p $0.112/$0.14 | optional | 3–15 s, multi-shot | yes | fal ([V3 Std](https://fal.ai/models/fal-ai/kling-video/v3/standard/image-to-video), [O3](https://fal.ai/models/fal-ai/kling-video/o3/standard/reference-to-video)). Direct Kling API requires prepaid packages from $700 ([aireiter](https://aireiter.com/blog/kling-api-pricing)). |
| Kling 3.0 Turbo | Jun 17 2026 | n/a | ¥0.8 ≈ $0.11, audio included | ¥1.0 ≈ $0.14 | included | not verified | yes | Kling, Atlas Cloud |
| Kling 4.0 / 4.0 Flash | Announced Sep 28; full model "October" | no API price | no API price | no API price | stereo | 3–30 s (Flash 3–20 s, 720p only) | yes | **no public API** ([fal explainer](https://fal.ai/learn/tools/what-is-kling-4-0)) |
| **Seedance 2.5** | Jul 31 2026 | BytePlus ≈$0.103*; fal $0.2205; Runway $0.20 | BytePlus ≈$0.231*; fal $0.473; Runway $0.30 | BytePlus ≈$0.569*; fal $1.164; Runway $0.68 | included; turning it off saves nothing | 4–30 s | yes | BytePlus ModelArk, fal, Runway (80-credit minimum per generation) ([fal](https://fal.ai/models/bytedance/seedance-2.5/image-to-video), [Runway](https://docs.dev.runwayml.com/guides/pricing/)) |
| Seedance 2.0 / 2.0 Mini | Feb 12 2026 / mid-2026 | Mini ≈$0.04* | 2.0 ≈$0.15*; Mini ≈$0.08*; Runway: 2.0 $0.36, Mini $0.16 | 2.0 on Runway $0.40 | yes | 4–15 s | yes | BytePlus, Runway, fal |
| **Grok Imagine Video 1.5 Lite** | ~Oct 1 2026 | $0.02 | $0.03 | $0.14 (upscaled from 720p) | native | 1–15 s | yes | xAI, fal, Runway ([xAI pricing](https://docs.x.ai/developers/pricing)) |
| Grok Imagine Video 1.5 | GA Jun 2026 | $0.08 | $0.14 | $0.25 | native, lip-sync | 1–15 s | yes | xAI, fal, Runway |
| LTX-2.5 Fast / Pro (API) | Aug 11 2026 | n/a | $0.09 / $0.12 | $0.13 / $0.17 | native | up to 20 s (third-party summary of the official spec) | yes (720×1280) | LTX API ([docs](https://docs.ltx.video/pricing)), fal |
| LTX-2.3 Fast / Pro (API) | Mar 2026 | n/a | $0.03 / $0.04 | $0.06 / $0.08 | native | not verified | yes | LTX API, fal (fal lists $0.04/s at 1080p) |
| Runway Gen-4.5 | late 2025 | n/a | $0.12 (720p output) | n/a | disputed | 2–10 s (not verified) | 720:1280 | Runway. **No Gen-5 appears in Runway's API model list.** |
| Luma Ray3.2 | 2026 | 540p $0.03 | $0.06 for a 5 s clip, $0.09/s for a 10 s clip | $0.24–0.36 | not verified | 5 / 10 s | not verified | Luma API ([pricing](https://lumalabs.ai/api)) |
| Vidu Q4 Preview | Oct 7 2026 | 540p $0.045* | $0.095* | $0.12* | native | 3–16 s | yes | Vidu, ComfyUI partner nodes ([ArtRealm](https://artrealmai.com/article/vidu-q4-preview-4k-api-comfyui-nodes)). Unite.AI reports launch pricing "from $0.014/s" without saying for which resolution. |
| Vidu Q3 Turbo / Pro | Jan 2026 | n/a | Turbo reference mode $0.05 ($0.025 off-peak)* | Pro $0.12 ($0.06 off-peak)* | native | 3–16 s | yes | Vidu, Atlas Cloud |
| PixVerse V6 | Mar 2026 | 540p $0.035 / $0.045 | $0.045 silent / $0.06 with audio | $0.09 / $0.115 | optional | not verified | yes | fal ([fal](https://fal.ai/pixverse-v6)) |
| Agnes Video 2.5 | Aug 2026 | n/a | $0.025* (Flash variant $0 during a promotion) | $0.04* | not verified | not verified | not verified | Agnes API ([docs](https://wiki.agnes-ai.com/en/docs/pricing)) |
| Pika 2.5 | 2025–26 | — | — | — | — | 5–25 s | — | through fal. Pricing not verified; not recommended. |
| Sora 2 | **Discontinued** (API closed Sep 24, 2026) | — | — | — | — | — | — | none |

*Third-party figure or conversion, not read from the vendor's own page. Seedance 2.5 on BytePlus is $10.70 per million tokens, where tokens ≈ height × width × seconds × 24 / 1024.

**Leaderboard context** (Artificial Analysis image-to-video, with audio, as of today; https://artificialanalysis.ai/video/leaderboard/image-to-video):

| Rank | Model | Elo |
|---|---|---|
| 1 | MiniMax H3 Max | 1195 |
| 2 | MiniMax H3 | 1181 |
| 3 | Vidu Q4 Preview | 1179 |
| 4 | Gemini Omni Flash | 1178 |
| 5 | Seedance 2.0 720p | 1176 |
| 7 | Wan 3.0 | 1164 |
| 9 | Grok Imagine 1.5 | 1098 |
| 12 | Veo 3.1 | 1082 |
| 15 | Veo 3.1 Lite | 1071 |
| 16 | PixVerse V6 | 1070 |
| 20 | Kling 3.0 Pro | 1055 |
| 23 | LTX-2.5 Fast (open weights) | 1038 |
| 25 | Agnes 2.5 | 1031 |
| 32 | LTX-2.3 Fast | 946 |

On the board without audio, the top five are Gemini Omni Flash (1368), Bach 1.0 Pro (1362), Wan 3.0 (1362), MiniMax H3 (1356) and Vimoo 1.0 (1348). That board matters more here because the pipeline adds its own TTS and music.

---

### 4. Character consistency, references and multi-shot
| Model | References accepted | Multi-shot and long takes |
|---|---|---|
| Kling 3.0 / O3 | `elements` parameter (frontal image plus extra reference images, or a video element), referenced in the prompt as @Element1, @Element2 | `multi_prompt` multi-shot within 3–15 s |
| Kling 4.0 (not on API yet) | Up to 10 images, 5 videos, 7 elements (≤3 of them video-based), 15 references in total; 10 keyframes | 30 s single take |
| Seedance 2.5 | Up to 50 references (30 images, 10 videos, 10 audio); Seedance 2.0 allowed 12 | Timed shot list inside one 30 s take |
| Veo 3.1 Standard / Fast | Up to 3 reference images, and using them forces an 8 s clip. Lite takes no references. First and last frame supported. | Extension |
| Gemini Omni 1.1 Flash | Several image references (Google's example uses 6); video references up to 3 clips of up to 3 s each; audio references not supported | Timestamped beats in the prompt; conversational editing over multiple turns |
| MiniMax H3 / H3 Max | Up to 9 images, 3 videos and 3 audio clips, 12 files in total. The first 5 images are free on H3 (2 on H3 Max), then $0.04 or $0.074 per extra image. | Optional H3-Context-IR prompt-enhancement step |
| Grok Imagine 1.5 | Up to 14 images and 3 voice references; up to 4 pinned mid-video keyframes. Lite takes no references. | — |
| Vidu Q4 Preview | 1–15 images and 0–3 audio clips | Automatic camera switching |
| Wan 3.0 | Image, video and audio references in combination, plus documents. Counts not verified. | Single 30 s generation |
| LTX-2.5 and Wan 2.2 (open weights) | You can train your own character or style LoRA, which is the strongest consistency tool for a fixed per-niche character | LTX-2.5 has native multi-shot |

**Practical pattern for Media Studio:**
1. Generate a character sheet and per-shot keyframes with an image model.
2. Animate each keyframe with image-to-video (first frame, or first and last frame).
3. Use reference mode only where the character must move across the scene.

Image-to-video from a good keyframe is the cheapest way to keep a character consistent, and every model above supports it.

---

### 5. Content policy (religious figures, real faces, children)
- **Religious figures:** no vendor policy I found bans depicting Jesus or other biblical figures. Jesus-themed AI videos are widely published (https://www.northcountrypublicradio.org/news/npr/nx-s1-5518263/). In practice, the risks are:
  - photoreal-face filters, especially Seedance;
  - filters for resemblance to public figures or actors and for copyrighted elements. Seedance 2.5 on Jimeng rejected a reference image as "possibly resembling a public figure" and blocked "copyright-protected elements" (https://pandaily.com/leiphone-test-seedance-2-5-vs-kling-video-3-0-short-video). Avoid imitating well-known actors, for example from The Chosen;
  - violence and gore filters for scenes such as the crucifixion. This last point is my judgment; test it.
- **Seedance 2.0 / 2.5:**
  - BytePlus docs state these models do not accept uploaded reference images or videos that contain real human faces (https://github.com/Comfy-Org/ComfyUI_frontend/pull/19638, quoting the docs).
  - Reports disagree on whether realistic AI-generated faces are also blocked.
  - The sanctioned workaround is BytePlus's private virtual portrait library: upload the portrait, get an asset ID, and pass the asset ID. Full access requires the "Advanced Creation Rights" upgrade (https://docs.byteplus.com/en/docs/ModelArk/2333565).
  - **High risk** for an "upload your own photoreal character" workflow. Low risk for kittens or stylized characters.
- **Veo 3.1:** in image-to-video, interpolation and reference-image modes, `personGeneration` only accepts `allow_adult`, so input images showing children are not allowed. Text-to-video uses `allow_all`. EU, UK, Switzerland and MENA have extra limits. Blocked generations are not charged (https://ai.google.dev/gemini-api/docs/veo). This affects scenes such as the Nativity, baby Moses or the boy David.
- **Gemini Omni:** uploading images of "certain recognizable people" is not supported. Uploading images of minors is blocked only in the EEA, Switzerland and the UK. Safety filters vary by region (https://ai.google.dev/gemini-api/docs/omni).
- **MiniMax:** the API returns error 1026 for "sensitive content". The open-weights release has its own safeguards against misuse involving minors.
- **xAI:** you are still charged for a generation that violates the usage guidelines, and requests rejected before generation carry a $0.05 fee (https://docs.x.ai/developers/pricing). Pre-check prompts with your LLM before calling it.
- **Children in general:** for Bible stories, prefer text-to-video or stylized keyframes for scenes with children, or use models with no stated restriction on minors, and test them.

### 6. Commercial use, watermarks, provenance and file retention
- **Google (Veo, Omni):** Google won't claim ownership of generated content. On the paid tier, inputs and outputs are not used to improve Google products. Outputs carry an invisible SynthID watermark (https://ai.google.dev/terms, https://ai.google.dev/gemini-api/docs/pricing).
- **Kling:** invisible watermark plus metadata "aligned with C2PA" (https://kling.ai/docs/ai-content-detection).
- **Seedance API:** a `watermark` flag defaults to false according to third-party docs. C2PA status unknown.
- **fal:** says content generated through its API can be used commercially (https://fal.ai/pixverse-v6).
- **Open-weights licenses:**

  | Model | License |
  |---|---|
  | Wan 2.2 | Apache 2.0 |
  | MAGI-2 | Apache 2.0 |
  | LTX-2.5 | Free for organizations under $10M revenue (third-party summary). Conflict: fal labels LTX-2.3 as Apache 2.0. |
  | MiniMax H3 | Community license. Open-weights use in the EU, UK, South Korea and the US currently needs a separately granted license, which affects renting GPUs in US data centers. |

- **Platform labels:** platforms read C2PA metadata and auto-label realistic AI content; disclosure is still expected. YouTube clarified its "inauthentic / mass-produced" monetization rules in July 2026 (https://techcrunch.com/2026/07/20/youtube-clarifies-policies-around-ai-slop-and-upsetting-videos/).
- **Retention, which matters for architecture:**
  - Wan 3.0 result URLs last 24 h (https://www.alibabacloud.com/help/en/model-studio/wan3-video-generation-api-reference).
  - Vidu result URLs last 24 h.
  - Veo keeps files on the server for 2 days.
  - Download every output to your own storage immediately.

### 7. Latency
| Model | Generation time | Source type |
|---|---|---|
| Veo 3.1 | 11 s minimum to 6 min at peak | official |
| Wan 3.0 | typically 1–5 min; poll about every 15 s | official |
| Seedance 2.5 | about 2–4 min per 5 s clip | single third-party test (Krea) |
| Kling 3.0 | 51–90 s per 5 s clip | single third-party test (Krea) |
| Omni Flash | about 2.5× faster than Seedance 2.0 | Design Arena, vendor-side claim |

Because generation is slow, design the pipeline as async jobs with webhooks or polling. MiniMax supports `callback_url`; fal has a queue API and webhooks.

---

### 8. Cheapest acceptable quality at 720p, and picks by style
**Budget tiers for faceless story reels at 720p:**
1. **Value pick: MiniMax H3 Max.** $0.05/s at 480p or $0.08/s at 768p. #1 on image-to-video quality, 9:16, 5–15 s.
2. **Low-cost pick: Veo 3.1 Lite.** $0.03/s video-only on Vertex, $0.05/s with audio on the Gemini API. Elo 1071, SynthID, predictable safety rules.
3. **Lowest cost per second: Grok Imagine 1.5 Lite.** $0.02–0.03/s. It reportedly ranks #17 on Artificial Analysis text-to-video (OrcaRouter, third-party). Use it for b-roll and backgrounds.
4. **Drafts:** Gemini Omni 1.1 Flash at 360p ($0.034/s) to iterate, then render keepers at 720p ($0.10/s).
5. **Not suitable for this budget:** Seedance 2.5, Veo 3.1 Standard, Kling's direct API, Runway Gen-4.5.

**Picks by style.** These are my judgment from the leaderboards and specs; I found no head-to-head test for these exact styles.
- **(a) Cinematic realistic, the Bible niche:**
  - Hero shots: Gemini Omni 1.1 Flash (best without audio, strong world knowledge), MiniMax H3 / H3 Max, Wan 3.0 (lifelike faces, 30 s takes).
  - Bulk shots: Veo 3.1 Lite.
  - Avoid Seedance as the default for uploaded photoreal humans because of the face filter.
  - Watch Veo's adults-only rule for image inputs.
- **(b) 3D Pixar-style kittens:** animals avoid the face and minor filters, so the main problem is consistency.
  - Kling O3 Standard with elements ($0.084/s silent on fal).
  - H3 Max reference mode (up to 9 images).
  - Grok 1.5 (up to 14 references, $0.08/s at 480p).
  - Seedance 2.0 Mini, which reviewers describe as strong on stylized characters (≈$0.08/s at 720p, third-party price).
  - Cheap fallback: image-to-video from consistent keyframes with Grok Lite or PixVerse V6 ($0.045/s).
  - Later: a self-hosted LoRA for the niche's default character.
- **(c) Illustrated or painterly, the biography niche:** the main risk is motion drifting toward photorealism.
  - Use image-to-video from painted keyframes with low-motion prompts. Cheap models handle subtle motion well.
  - Many shots can simply be 2.5D parallax or Ken Burns at zero generation cost.
  - Long term: Wan 2.2 or LTX with a style LoRA.

### 9. Budget scenarios (video generation only; 1.5× retry factor)
| Workload (billed seconds per month) | $0.02/s | $0.03/s | $0.05/s | $0.08/s | $0.10/s | Seedance 2.5 on BytePlus ($0.231/s) |
|---|---|---|---|---|---|---|
| A: 60–90 clips of ~6 s (540–810 s) | $11–16 | $16–24 | $27–41 | $43–65 | $54–81 | $125–187 |
| Hybrid: 60–90 videos × 12 s of motion (1,080–1,620 s) | $22–32 | $32–49 | $54–81 | $86–130 | $108–162 | $249–374 |
| B: 60–90 videos × 40 s of motion (3,600–5,400 s) | $72–108 | $108–162 | $180–270 | $288–432 | $360–540 | $832–1,247 |

Conclusion: within $100 a month, use the hybrid format with H3 Max at 480p or Veo Lite or Grok Lite for motion, and keep Omni or H3 at 768p for 1–2 hero shots per video.

### 10. Self-hosting
**GPU rental prices** (all billed per second):

| Provider | RTX 4090 | RTX 5090 | H100 |
|---|---|---|---|
| RunPod Community / Secure | $0.34 / $0.74 per hr | $0.69 / $0.99 per hr | PCIe $1.99 / $2.89; SXM $2.69 / $3.49; Serverless $4.55 |
| Vast.ai spot, cheapest live listing today | ≈$0.20 | ≈$0.33 | PCIe ≈$1.33 |
| Persistent storage | RunPod network volume $0.07/GB-month for the first TB | | |

Sources: https://www.runpod.io/gpu-models/rtx-4090, https://www.runpod.io/gpu-models/rtx-5090, https://www.runpod.io/articles/guides/nvidia-h100, https://www.madebyagents.com/hardware/gpu-rental-prices.

**Throughput:**
- **Wan 2.2 A14B, LightX2V distilled version (NVFP4, 4 steps, Blackwell GPUs only):** on an RTX 5090, a 720p image-to-video clip takes 26.7 s and text-to-video 22.5 s. The 40-step baseline takes about 2,685 s (https://huggingface.co/lightx2v/LightWan2.2-A14B). Assuming about 5 s clips, that is roughly 130 clips, or about 11 minutes of video, per GPU-hour, or about $0.0015 per second of video.
- **Standard Wan 2.2 Lightning LoRA (Apache 2.0):** the official script expects 80 GB of VRAM without offloading. A third-party report puts a 4090 with offloading at about 4–5 min per clip, or about 60–75 s of video per hour.
- **LTX-2.5 distilled int8:**
  - RTX 5090: about 25 s for a 4 s 720p clip. 8 s clips spill out of VRAM and take about 3 min.
  - RTX 4090: 5 s clips fit in 22.67 GiB.
  - RTX 3090: about 2.5 min per 5 s clip.
  - Sources: https://runaihome.com/blog/ltx-2-5-local-ai-video-hardware-guide-2026/, https://www.nvidia.com/en-sg/geforce/news/rtx-ai-video-generation-guide/
  - No verified H100 timings; I expect it to be faster with no memory limit (judgment).
- **MiniMax H3 open weights:** a 33B transformer plus a Qwen3-VL-32B encoder, multi-GPU examples, and only 768p without the hosted modules. Not practical here, and the license excludes US deployment.

**Break-even:**
- **Scenario A (about 800 billed seconds a month):** self-hosting compute is about $1–2. Storage (about 100 GB, $7) plus idle and boot time brings it to roughly $10–15, against $16–41 for a budget API. Not worth the effort.
- **Scenario B (about 5,400 billed seconds a month):** about 1,080 clips of 5 s, which is roughly 8–10 GPU-hours on a 5090 ($6–10), or about $20–40 a month with overhead and storage, against $108–162 for the cheapest API. Clearly cheaper, but quality is LTX-2.5-class (Elo 1038) or Wan 2.2-class, and you take on DevOps, cold starts and loading 35–60 GB of weights.

**Recommendation:**
- Start API-only. Use fal as the single aggregator (it covers Kling, Seedance, Wan, LTX, Grok, PixVerse and H3 Max), and call Google, xAI and MiniMax directly where they are cheaper.
- Build a provider-adapter interface from the start.
- Add a RunPod worker for LTX-2.5 or Wan 2.2 once you run several niches or fully animated formats.

### 11. Open questions to verify before committing
1. Kling official per-second rates and the $700 minimum package (the official page did not render for me).
2. Seedance 2.5 API availability and token prices for your account in the BytePlus console.
3. Grok 1.5 Lite and H3 Max quality on your actual Bible and kitten prompts. Run a blind test of 10 prompts on 5 models.
4. Whether realistic AI-generated character sheets pass Seedance and Omni face filters.
5. Kling 4.0 API launch date and pricing.
6. Wan 3.0's limited-time discount and its preview status.
7. The LTX license conflict: community license versus Apache 2.0.