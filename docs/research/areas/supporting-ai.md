## Supporting AI services for Media Studio: what to use and what it costs (as of 2026-10-09)

Scope: every service except video generation. I took prices from the official vendor pages wherever I could open them. The exceptions are marked "(3rd-party)" and have lower confidence. "NEW" marks a change from roughly the last 3 months.

---

### 0. Summary

**Budget warning (critical).** At 2–3 videos/day per niche, one niche is about 90 videos/month and three niches are about 270. The lean stack below costs about $0.25–0.35 per 60-second video for supporting services alone. That is about $25–30/month for one niche and about $70–90/month for three. With a $100/month total budget, almost nothing would be left for per-shot AI video at three niches. To fit, you would need some combination of: batch APIs, reusing backgrounds and character sheets, a reusable music library, a few self-hosted parts (WhisperX, Kokoro), and fewer full AI-video shots.

**Recommended stacks**

| Layer | Cheapest stack that is good enough | Premium stack |
|---|---|---|
| Research + script + shot list + prompts | Claude Haiku 5.5 or Gemini 3.8 Flash for drafts and prompt expansion. Bible stories are grounded on a local public-domain Bible text instead of web search. Optionally run only the final script through Claude Sonnet 5.5 via the Batch API (~$0.06). | Claude Opus 5.5 (or Sonnet 5.5) with structured outputs |
| Character sheet (one time per character) | Nano Banana Pro, about 6 images, about $0.80 one-time | Nano Banana Pro, plus Seedream 5.0 Pro / gpt-image-2.5-sunburst for touch-ups |
| Keyframes / backgrounds | Nano Banana 2.1, Batch, 1K: $0.0168/image (up to 4 character refs) | Nano Banana Pro: $0.134 standard / $0.067 batch (5 character refs + 3 style refs) |
| Narration | Gemini 3.8 Flash TTS: $0.0135/min until Dec 31, 2026, then $0.027/min. Alternatives: Cartesia Pro ($5/mo, about 133 min, includes word timestamps), or Kokoro self-hosted (free) | ElevenLabs v4/v3. The Creator plan is $22/mo and covers about 275 min at v3 rates. Returns character-level timestamps. |
| Captions | WhisperX alignment (free, BSD-2), or ElevenLabs Forced Alignment ($0.22/hr) | Use the TTS timestamps directly (no extra cost) |
| Music | A Lyria 3.5 library per niche: $0.08/song, about 30 tracks ≈ $2.40 one-time, rotated | ElevenLabs Music $0.15/min (not for the Bible niche, see §4), or Stable Audio 3.0 $0.26/generation |
| Bible text | World English Bible (WEB, including its Catholic edition) and Douay-Rheims (Challoner). Both public domain, stored locally. | Same. Do not narrate NIV. Quote ESV only within its limits. |

---

### 1. Changes in the last ~3 months

- **ElevenLabs v4 and v4 Turbo** launched Sep 28, 2026. Promo prices run until Oct 12: v4 at $0.022 per 1K characters (list price $0.08) and v4 Turbo at $0.011 (list $0.04). Budget at list price. Sources: https://elevenlabs.io/pricing/api, https://techcrunch.com/2026/09/28/elevenlabs-new-v4-speech-model-supports-more-expression-control-and-90-languages/
- **OpenAI gpt-image-2.5** (`-sunburst` and `-flare`) launched Sep 8, 2026. Token rates are the same as gpt-image-2. It adds `xhigh` and `max` quality levels. Sources: https://developers.openai.com/api/docs/guides/image-generation, launch date (3rd-party) https://cellcog.ai/blog/gpt-image-2-5-release-date/
- **FLUX 3 Image** launched Oct 1, 2026 (the FLUX 3 family was announced Jul 23). It costs $0.048 per 1K image. Sources: https://docs.bfl.ai/quick_start/pricing, https://www.techtimes.com/articles/328502/20261002/black-forest-labs-launches-flux-3-image-json-bounding-boxes-lock-unchanged-pixels-numerically.htm
- **Nano Banana 2.1** (`gemini-nano-banana-2.1`) is now Google's main image model. Its 1K images cost half as much as Nano Banana 2's. GA date of about Oct 6 comes from a 3rd-party source. Source: https://ai.google.dev/gemini-api/docs/pricing
- **Gemini 3.6/3.7/3.8 Flash and 3.8 Flash TTS** are on introductory pricing until Dec 31, 2026. Prices double on Jan 1, 2027. Source: https://ai.google.dev/gemini-api/docs/pricing
- **Lyria 3.5** is now in the Gemini API at $0.08 per song. Source: https://ai.google.dev/gemini-api/docs/pricing
- **MiniMax Music API** closed to new users from Aug 20, 2026. Source: https://platform.minimax.io/docs/guides/pricing-paygo
- **Suno** has had no public API since July 2026. It only has an early-access partner intake form. Source: https://www.digitalmusicnews.com/2026/07/03/suno-is-opening-an-api-partner-program/
- **Claude Sonnet 5 pricing:** the planned Sep 1, 2026 increase was cancelled, so $2/$10 is now permanent. Source: https://platform.claude.com/docs/en/about-claude/pricing
- **OpenAI** pricing now lists the GPT-6 family. "Priority" was renamed "Fast mode" on Jul 30, 2026. gpt-4o-mini-tts is labelled "Deprecated". Sources: https://developers.openai.com/api/docs/pricing, https://developers.openai.com/api/docs/models/gpt-4o-mini-tts
- **IndexTTS-2.5** released Aug 10, 2026. Source: https://github.com/index-tts/index-tts
- **Biblica (NIV) permissions page** updated Aug 13, 2026. It now has an explicit AI clause. Source: https://www.biblica.com/permissions/

---

### 2. LLM for research, script, shot list and prompt writing

Cost assumption per video: about 15k input tokens (system prompt, style guide, story source) and about 9k output tokens (about 6k visible plus about 3k thinking). Thinking tokens are billed as output. All three vendors offer a 50% Batch discount.

| Model (API id) | $/MTok in / out | Est. cost per script | Batch | Structured output | Source |
|---|---|---|---|---|---|
| Claude Opus 5.5 (`claude-opus-5-5`) | $4 / $20 (cache hit $0.20) | ~$0.24 | $2 / $10 | Yes: `output_config.format`, plus `strict: true` tools. Thinking can't be turned off; effort defaults to `medium`. Forced `tool_choice` returns a 400 (use `auto` + strict). | https://platform.claude.com/docs/en/about-claude/pricing |
| Claude Sonnet 5.5 (`claude-sonnet-5-5`) | $2 / $10 | ~$0.12 | $1 / $5 | Yes, same as above | same |
| Claude Haiku 5.5 (`claude-haiku-5-5`) | $0.10 / $0.50 for prompts ≤100k tokens | ~$0.006 | $0.05 / $0.25 | Yes | same |
| Gemini 3.1 Pro (header cut off on the page; the id is probably gemini-3.1-pro) | $2 / $12 (≤200k) | ~$0.14 | $1 / $6 | JSON schema (not re-verified this session) | https://ai.google.dev/gemini-api/docs/pricing |
| Gemini 3.8 Flash (`gemini-3.8-flash`) | $0.75 / $3.75 until Dec 31 2026, then $1.50 / $7.50 | ~$0.045, then ~$0.09 | $0.375 / $1.875 | Yes. A free tier exists (rate-limited; your data is used to improve Google's products). | same |
| Gemini 3.5 Flash-Lite | $0.30 / $2.50 | ~$0.027 | $0.15 / $1.25 | Yes | same |
| OpenAI gpt-6.1-sol | $2 / $10 | ~$0.12 | $1 / $5 | Structured Outputs | https://developers.openai.com/api/docs/pricing |
| OpenAI gpt-6-luna | $0.10 / $0.50 | ~$0.006 | $0.05 / $0.25 | yes | same |
| OpenAI gpt-6-astra | $10 / $50 | ~$0.60 | $5 / $25 | yes | same |
| MiniMax-M3 | $0.30 / $1.20 (after a "permanent 50% off") | ~$0.015 | n/a | n/a | https://platform.minimax.io/docs/guides/pricing-paygo |

Search grounding for research:
- Claude web search: $10 per 1,000 searches. Code execution is free when used with the `web_search_20260209` tool.
- Gemini grounding: 5,000 free searches/month shared across Gemini 3.x models, then $14 per 1,000.
- OpenAI web search: $10 per 1,000 calls.

For Bible stories you can skip web search entirely and ground the model on the local Bible text.

Monthly LLM cost at 90 videos: Sonnet 5.5 ≈ $11 (≈ $5.50 with Batch), Haiku 5.5 ≈ $0.50, Gemini 3.8 Flash ≈ $4, Opus 5.5 ≈ $22.

---

### 3. Image generation and editing (character sheets, keyframes, backgrounds)

| Model | Price per image | Reference images | Notes | Source |
|---|---|---|---|---|
| **Nano Banana 2.1** `gemini-nano-banana-2.1` | 1K $0.0336, 2K $0.0504, 4K $0.113. Batch: 1K $0.0168. Input $1.50/MTok. | Up to 14 total: up to 10 object images plus up to 4 character images | Multi-turn character consistency, Google Search grounding, SynthID watermark, 9:16 supported. No free tier. | https://ai.google.dev/gemini-api/docs/pricing, https://ai.google.dev/gemini-api/docs/image-generation |
| **Nano Banana Pro** `gemini-3-pro-image` | $0.134 (1K/2K), $0.24 (4K). Batch $0.067 / $0.12. Input image ≈ $0.0011. | Up to 6 object, 5 character, **3 style** reference images | Best Google option for locking a niche style preset (realistic / Pixar-like 3D / illustration) | same |
| Nano Banana 2 Lite `gemini-3.1-flash-lite-image` | $0.0336 (batch $0.0168) | Up to 14 objects; not optimized for multiple references | Not suitable for character consistency | same |
| Nano Banana 2 `gemini-3.1-flash-image` | 1K $0.067 (batch $0.034) | 10 object + 4 character | Superseded by 2.1 | same |
| OpenAI `gpt-image-2.5-sunburst` / `-flare` | Token-based: image output $30/MTok, image input $8/MTok, text input $5/MTok. 3rd-party estimates for 1024²: about $0.006 (low), $0.013 (medium), $0.053 (high), $0.21 (max). gpt-image-2 official: portrait medium $0.041, high $0.165. | Multiple reference images | OpenAI's own docs say it "may occasionally struggle to maintain visual consistency for recurring characters" | https://developers.openai.com/api/docs/guides/image-generation; estimates: https://cellcog.ai/blog/gpt-image-2-5-release-date/ |
| FLUX.2 [pro] / [max] / [flex] / [klein 4B] | pro from $0.03 (edit from $0.045); max from $0.07; flex from $0.05; klein 4B from $0.014 | Up to 8 via API, 10 in the playground | FLUX.2 [dev] is local-only and non-commercial | https://docs.bfl.ai/quick_start/pricing, https://docs.bfl.ml/flux_2/flux2_image_editing |
| FLUX 3 Image (NEW) | 768² $0.041, 1k $0.048, 2k $0.100, 4k $0.607 | Up to 10 references (3rd-party) | Launched Oct 1, 2026 | https://docs.bfl.ai/quick_start/pricing |
| FLUX.1 Kontext [pro] / [max] | $0.04 / $0.08 | Single image plus text | Previous generation | same |
| Seedream 5.0 Pro (ByteDance / BytePlus) | "From $0.045/image". First reference free, extra references from $0.003. The page labels this as a new-user offer. Seedream 4.0 is $0.03. | 10 references (3rd-party; one source says 14) | List price after promos is unclear | https://www.byteplus.com/en/product/Seedream, https://docs.byteplus.com/en/docs/ModelArk/1824718 |
| Qwen (Alibaba Model Studio, Singapore/International) | qwen-image-edit-plus $0.03; qwen-image-edit $0.045; edit-max $0.075; qwen-image-3.0 1k $0.03 (+$0.003 per input image); qwen-image-2.0 $0.035 | Multi-image edit | Open weights **Qwen-Image-Edit-2511 under Apache 2.0** ("improved character consistency"), so it can be self-hosted | https://www.alibabacloud.com/help/en/model-studio/model-pricing, https://huggingface.co/Qwen/Qwen-Image-Edit-2511 |
| Ideogram | 4.0 Turbo / Default / Quality: $0.03 / $0.06 / $0.10. **Character Reference only on 3.0**: $0.10 / $0.15 / $0.20 | 1 character reference | Strong at typography (thumbnails) | https://ideogram.ai/pricing/?pricing_tab=api |
| Midjourney | **No official public API** (3rd-party). Unofficial Discord/web wrappers break Midjourney's terms and risk account bans. | – | Do not build on it | https://www.wireflow.ai/blog/best-midjourney-api-tools-in-2026 |

**Turning one uploaded image into a turnaround sheet.** Do this once per character. Generate about 4–8 views (front, 3/4, side, back, plus expressions) with Nano Banana Pro: 5 character refs plus 3 style refs ≈ $0.80. Then use the sheet as the character references for every keyframe on Nano Banana 2.1 (Batch).

Per-video image cost: a 60s Short with about 10 shots plus about 50% retries is about 15 images:
- Nano Banana 2.1 Batch: ≈ $0.25
- Nano Banana Pro Batch: ≈ $1.00
- 1–3 minute videos: about 2–3 times these numbers

---

### 4. English narration (TTS)

As a rule of thumb, 1K characters ≈ 1 minute of speech (ElevenLabs' own conversion).

| Service / model | Price per minute (approx.) | Storytelling / emotion | Cloning | Word timestamps | Source |
|---|---|---|---|---|---|
| **ElevenLabs v4** (NEW) | List $0.08/1K characters ≈ $0.08/min (promo $0.022 until Oct 12). Plans: Starter $6, Creator $22, Pro $99. Creator includes about 275k characters at v3 rates. | Audio tags; can stack multiple tags (3rd-party); 90+ languages | Yes (cloning from about 10s of audio, 3rd-party) | `/with-timestamps` endpoint returns character-level alignment | https://elevenlabs.io/pricing/api, https://elevenlabs.io/docs/api-reference/streaming-with-timestamps |
| ElevenLabs v3 / Flash | v3 $0.08/1K; Flash/Turbo $0.04/1K | v3 is the "dramatic performances" model (5k-character limit) | Yes | Yes | same |
| **Gemini 3.8 Flash TTS** | $0.0135/min until Dec 31, 2026; $0.027/min from 2027 (25 audio tokens/s). Batch is half. Free tier available. | Per-turn `style` field plus inline tags; 30 studio voices plus an extended library | Voice design and voice replication (needs consent audio). Up to 200 stored voices per project. | **None documented**, so add an alignment step | https://ai.google.dev/gemini-api/docs/pricing, https://ai.google.dev/gemini-api/docs/speech-generation |
| Gemini 3.8 Flash-Lite TTS | $0.009/min (→ $0.018) | Lighter model | Yes | None | same |
| OpenAI gpt-4o-mini-tts | $0.60/MTok text in, $12/MTok audio out; OpenAI's estimate ≈ $0.015/min | Steerable via `instructions` | No | No | https://developers.openai.com/api/docs/models/gpt-4o-mini-tts (labelled **Deprecated**) |
| MiniMax speech-2.8-hd / turbo | $100 / $60 per M characters ≈ $0.10 / $0.06 per min | Good expressiveness | Rapid clone $1.50/voice; voice design $3 | `subtitle_enable` + `subtitle_type: "word"` on the synchronous HTTP endpoint; the async endpoint gives sentence-level timing only | https://platform.minimax.io/docs/guides/pricing-paygo, https://platform.minimax.io/docs/api-reference/speech-t2a-http |
| **Cartesia Sonic-3.6** | Pro $5/mo for 100K credits ≈ 133 min (≈ $0.04/min); overage $65 per M credits; Startup $49 for about 1,667 min | Good | Instant cloning on Pro; professional cloning on Startup+ | `add_timestamps` returns word-level timings | https://www.cartesia.ai/pricing, https://docs.cartesia.ai/api-reference/tts/tts |
| Deepgram Aura-2 | $0.030/1K characters | Built for voice agents, not storytelling | – | – | https://deepgram.com/pricing |
| Kokoro-82M (open) | Free (runs on CPU) | Decent, but no cloning; 54 voices | No | Via alignment | **Apache-2.0**: https://huggingface.co/hexgrad/Kokoro-82M |
| Chatterbox / Turbo / Nano (open) | Free (GPU) | Exaggeration control and paralinguistic tags; embeds a PerTh watermark | Zero-shot | Via alignment | **MIT**: https://huggingface.co/ResembleAI/chatterbox |
| Dia2 (open) | Free | Dialogue; English only; up to 2 minutes | – | – | **Apache-2.0**: https://huggingface.co/nari-labs/Dia2-2B |
| IndexTTS-2.5 (open) | Free | Fine-grained emotion and duration control | Zero-shot | – | Custom bilibili license; commercial use reportedly capped by user/revenue thresholds (3rd-party). Check before use. https://github.com/index-tts/index-tts |
| F5-TTS | – | – | – | – | **Weights CC-BY-NC-4.0, so no commercial use** (3rd-party) |
| Fish Audio S2 | – | – | – | – | **Research/non-commercial license; commercial use needs a separate deal** (3rd-party summary of https://huggingface.co/fishaudio/s2-pro/blob/main/LICENSE.md) |

---

### 5. Music and sound effects: price and commercial / Content ID risk

| Option | Price | Commercial use / risk | Source |
|---|---|---|---|
| **Google Lyria 3.5** (`lyria-3.5`, Gemini API) | $0.08/song (a full song of "a couple of minutes"); Lyria 3 Clip $0.04 per 30s | Instrumental-only is possible via the prompt. 44.1 kHz. SynthID watermark. Gemini API terms: "Google won't claim ownership" of generated content. There are no Lyria-specific commercial terms; YouTube/Meta treatment is unverified. | https://ai.google.dev/gemini-api/docs/pricing, https://ai.google.dev/gemini-api/docs/music-generation, https://ai.google.dev/gemini-api/terms |
| ElevenLabs Music (v2/v2.5) | $0.15/min; monthly generation caps per plan (Starter 17 min, Creator 62, Pro 304) | Self-serve plans allow "all online and offline commercial use except film, TV, radio, Studio Games"; no attribution needed on paid plans. **Critical: the Music Terms (26 May 2026) bar customers that operate as "religious organizations or institutions".** A solo Bible-story channel is a gray area, so avoid it for the Bible niche or get written confirmation. | https://elevenlabs.io/music-terms, https://elevenlabs.io/eleven-music-model-specific-terms |
| ElevenLabs Sound Effects | $0.12/min, royalty-free | Fine for SFX | https://elevenlabs.io/pricing/api |
| Stable Audio 3.0 / 2.5 | 26 / 20 credits = $0.26 / $0.20 per generation (up to 6 / 3 minutes) | Trained on licensed data (3rd-party). Read the API terms. | https://platform.stability.ai/pricing |
| Suno | No official public API | Unofficial wrappers use cookies and break Suno's terms. Suno is still in litigation with UMG and Sony. **Avoid.** | https://www.digitalmusicnews.com/2026/07/03/suno-is-opening-an-api-partner-program/ |
| MiniMax Music | Closed to new users from Aug 20, 2026 | – | https://platform.minimax.io/docs/guides/pricing-paygo |
| YouTube Audio Library | Free | YouTube: "copyright-safe … won't be claimed … through Content ID". Standard-license tracks are reportedly YouTube-only (3rd-party), so they are not safe for FB/IG/TikTok copies of the same video. CC-BY tracks need credit. | https://support.google.com/youtube/answer/3376882, https://lickd.co/youtube-audio-library/ |
| Pixabay Music | Free; commercial use allowed; no attribution | Pixabay's own FAQ warns some contributors register tracks with Content ID, so **claims can happen** | https://pixabay.com/service/faq/ (3rd-party summaries) |
| Meta Sound Collection | Free inside FB/IG | Reportedly can't be used outside Meta products (3rd-party) | https://artyfile.com/music-for-reels |

**Recommendation.** Generate an owned instrumental library per niche with Lyria 3.5 (about 30 tracks ≈ $2.40), add an ID3/metadata log of how each track was made, and use the same files on every platform. Never use Suno wrappers or YouTube-only tracks in cross-posted videos.

---

### 6. Captions and alignment

The narration text is already known, so forced alignment is better than full transcription.

| Option | Cost | Notes | Source |
|---|---|---|---|
| TTS-native timestamps (ElevenLabs, Cartesia, MiniMax word mode) | Included | Simplest path | see §4 |
| WhisperX (self-hosted) | Free | wav2vec2 alignment gives accurate word-level timestamps; BSD-2-Clause | https://github.com/m-bain/whisperX |
| ElevenLabs Forced Alignment | Same rate as Scribe v2: $0.22/hr ≈ $0.0037/min | Up to 10 hours / 675k characters per request | https://elevenlabs.io/docs/overview/capabilities/forced-alignment, https://elevenlabs.io/pricing/api |
| Gemini 3.5 Transcribe | ≈ $0.005/min | Google says it supports word-level timestamps | https://ai.google.dev/gemini-api/docs/pricing |
| Deepgram Nova-3 (pre-recorded) | $0.0043/min; Whisper Large $0.0048/min | | https://deepgram.com/pricing |
| OpenAI gpt-transcribe / gpt-4o-mini-transcribe | $0.0045 / $0.003 per min | Reportedly no word timestamps (3rd-party) | https://developers.openai.com/api/docs/pricing |

---

### 7. Bible text sources and licensing

| Text | Status | Source |
|---|---|---|
| **World English Bible (WEB)**, including the **WEB Catholic edition** (deuterocanon, Catholic book order) | Public domain. The name "World English Bible" is a trademark, so you can't use it for an altered text. **Best default.** | https://ebible.org/web/copyright.htm, https://ebible.org/eng-web/ |
| **Douay-Rheims (Challoner)** | Public domain; the Catholic option | https://www.gutenberg.org/ebooks/8300 |
| KJV / ASV | Public domain in the US. KJV has Crown rights in the UK (some editions carry additional BFBS copyright). | https://www.bible.com/versions/1 |
| **NIV (Biblica)** | **Do not use.** Biblica's FAQ: "Can I record and post a Scripture-reading video? **No.**" Any AI/ML use needs a Biblica license. The 500-verse guideline applies to a platform/channel as a whole. API.Bible: NIV commercial use "not available". | https://www.biblica.com/permissions/, https://api.bible |
| ESV | Audio/video allowed for ≤500 verses **only if** quotes are under 50% of any Bible book and under 25% of the work; needs the full copyright notice plus a verbal "ESV" credit. The ESV API is free for **non-commercial** use only. | https://www.crossway.org/permissions/ |
| NABRE (USCCB) | No permission needed below 5,000 words if under 40% of a Bible book and under 40% of the work, in print/sound/eBook. Web/digital uses need a license. | https://www.usccb.org/offices/new-american-bible/permissions |
| API.Bible | Free Starter plan is strictly non-commercial. Pro is $29+/mo. Copyrighted translations used commercially cost from $10/mo per translation. | https://api.bible |
| bible-api.com | Free; WEB is the default, plus KJV, ASV, DRA and others. Rate limit 15 requests per 30s; no guarantees. The author asks you not to download whole Bibles through the API; use the open data instead. | https://bible-api.com/ |

**Recommendation:** load WEB, WEB-Catholic and DRA into your own database, with no runtime Bible API.

---

### 8. Platform-policy risks that affect the supporting stack (critical)

YouTube's monetization policy (https://support.google.com/youtube/answer/1311392):
- On Jul 15, 2025 YouTube renamed "repetitious" content to "inauthentic content".
- It excludes "AI-generated content made with generic or unoriginal templates giving the impression of mass production".
- Under reused content, it excludes "content that exclusively features readings of other materials you did not originally create".

Effect on design:
- **Pure verbatim scripture narration is a monetization risk.** The LLM step must produce original narrative and commentary, with scripture only quoted inside it.
- The pipeline needs real per-video variation in storyline, visuals and music.

A mid-2026 YouTube clarification (Jul 16, 2026) is reported only by 3rd-party sources.

---

### 9. Per-video cost model (60s Short)

| Item | Lean | Premium |
|---|---|---|
| LLM | $0.006–0.06 | $0.12–0.24 |
| Images (~15) | $0.25 (NB 2.1 Batch) | $1.00 (NB Pro Batch) to $2.01 (standard) |
| TTS (~1 min) | $0.0135 (Gemini) or $0 (Kokoro) | ~$0.08 (ElevenLabs list price), or flat $22/mo Creator |
| Music | ~$0.01 (amortized library) | $0.15 (ElevenLabs) / $0.26 (Stable Audio 3.0) |
| Captions | $0–0.004 | $0 (TTS timestamps) |
| **Total** | **≈ $0.28–0.34** | **≈ $1.4–2.6** |
| ×90 videos/month | ≈ $25–31 | ≈ $125–235 (over budget) |

**Where to save:**
- Batch APIs: 50% off at Claude, Gemini and OpenAI.
- Claude prompt caching: cache hits cost 0.05× input on Opus/Sonnet 5.5.
- Gemini free tier for development.
- Reuse character sheets and background plates.

**Open items to verify before committing:**
- Seedream 5.0 Pro list price after the new-user promo.
- IndexTTS license thresholds.
- Lyria and Stable Audio commercial terms for API output.
- Whether ElevenLabs treats a Bible-story media channel as a "religious organization".
- Meta's own Sound Collection terms.