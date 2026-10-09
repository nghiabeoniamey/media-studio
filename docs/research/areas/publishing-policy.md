# Media Studio: publishing, scheduling, platform policy and reference format (state as of 2026-10-09)

**How this was researched.** Official vendor docs were read directly through TinyFish `fetch_content`: Meta for Developers, Google/YouTube, TikTok for Developers, the YouTube Help Center, the Meta Help Centre, the TikTok Creator Academy and the vendors' own pricing pages. Where only third-party sources exist, this is marked and confidence is lowered. Items marked **[NEW]** changed in roughly the last 3 months (after about 2026-07-09) or are just outside that window but important.

---

## 0. Key takeaways (read first)

1. **The reel URL the user gave is not a Jesus Daily reel.** `facebook.com/reel/1645273697214268` resolves to a Vietnamese creator, **Phạm Công Trúc**. Its caption is *"Cách làm ra một bộ phim AI chuyên nghiệp, giữ nguyên được nhân vật, góc máy…"* ("How to make a professional AI film keeping characters and camera angles consistent"). It had 12K views, 69 reactions, 12 comments and 42 shares when fetched. It is a tutorial on character consistency, not a format reference. The Jesus Daily analysis in §4 uses 10 reels from the page's own Reels tab instead. ([fetched OG metadata](https://www.facebook.com/reel/1645273697214268))
2. **Where the money comes from depends on where the operator lives, not on the platform:**
   - **YouTube Partner Program (YPP):** available in Vietnam ([YPP availability](https://support.google.com/youtube/answer/7101720?hl=en)).
   - **TikTok Creator Rewards (CRP):** open only in US, UK, DE, JP, KR, FR, MX and BR. The creator "must be based in one of these countries and have an account registered there" ([TikTok Creator Academy, updated Sep 10, 2026](https://www.tiktok.com/creator-academy/article/creator-rewards-program)).
   - **Facebook Content Monetization:** invite-only. One third-party source (checked 2026-09-18) says Vietnam is **not** among Meta's 70 eligible countries ([contentmonetizing.com](https://contentmonetizing.com/en/tiktok-monetization-countries/)). Medium-low confidence; I could not open Meta's own list.
   - **So YouTube is the only platform with a clear payout path from Vietnam.** FB, IG and TikTok are mainly reach and funnel. Do not fake residency; that breaks program terms.
3. **TikTok cannot realistically be automated with your own developer app.** TikTok's Direct Post guidelines list as *"Not acceptable: A utility tool to help upload contents to the account(s) you or your team manages."* Unaudited clients can only post `SELF_ONLY` (private) and are limited to 5 users per 24 h ([TikTok Content Sharing Guidelines, updated Aug 4, 2026](https://developers.tiktok.com/doc/content-sharing-guidelines)). Use an audited aggregator, or post to TikTok manually.
4. **Facebook and Instagram can be automated with your own Meta app without App Review**, as long as the app is used only by people who have a role on it and on Pages/accounts you own. Meta says: *"If your app only serves your Instagram professional account or an account you manage, Standard Access is all your app needs"* ([IG Platform overview, updated Sep 28, 2026](https://developers.facebook.com/docs/instagram-platform/overview); [Access Levels](https://developers.facebook.com/docs/graph-api/overview/access-levels/)).
5. **YouTube upload quota was relaxed [NEW].** `videos.insert` now has its own bucket: 100 calls per day at 1 unit per call ([videos.insert](https://developers.google.com/youtube/v3/docs/videos/insert); [Quota Calculator, updated 2026-09-15](https://developers.google.com/youtube/v3/determine_quota_cost)). That is no longer the 1,600-of-10,000-units constraint. **However, an unverified API project still uploads only private videos** until it passes a compliance audit.
6. **Cheapest publishing option that covers all four platforms, including TikTok:** Upload-Post Basic at **$16/mo billed annually**. It includes 5 "profiles", and each profile holds one account per platform, so one profile per niche. Zernio (formerly Late) is the usage-priced alternative: about **$12/mo** for one niche on 4 platforms.
7. **Policy risk for this niche is real and documented.** *Imperio de Jesús*, a Spanish-language AI Jesus channel with 5.87M subscribers, was removed from YouTube in the early-2026 "AI slop" crackdown ([Tubefilter, 2026-01-29](https://www.tubefilter.com/2026/01/29/youtube-ai-slop-channel-crackdown-bans/); [Kapwing report](https://www.kapwing.com/blog/ai-slop-report-the-global-rise-of-low-quality-ai-videos/)). YouTube's policy explicitly lists *"Image slideshows, templated storylines…"* and *"AI-generated content made with generic or unoriginal templates giving the impression of mass production"* as non-monetizable ([YouTube monetization policies](https://support.google.com/youtube/answer/1311392?hl=en)). TikTok CRP excludes *"low-quality images, or slide videos"*. **Pure image plus Ken Burns at 2–3 per day per niche is the riskiest format choice.**
8. **AI labels are effectively mandatory on every video, because the narration is TTS.** Meta lists *"A reel narrated with a realistic AI-generated voiceover"* as content that requires an AI label ([Meta Help](https://www.meta.com/en-gb/help/artificial-intelligence/1783222608822690/)). All APIs now expose a flag for it:
   - FB `video_reels`: `is_ai_generated`
   - IG media: `is_ai_generated`
   - TikTok: `is_aigc` [NEW]
   - YouTube: `status.containsSyntheticMedia`

---

## 1. Official APIs (October 2026)

### 1.1 Facebook Page Reels (Graph API v26.0)

| Item | Value | Source |
|---|---|---|
| Flow | `POST /{page_id}/video_reels` (`upload_phase=start`), then upload the binary to `rupload.facebook.com`, then `POST /{page_id}/video_reels` (`upload_phase=finish`, `video_state=PUBLISHED`) | [Reels Publishing guide, updated Jul 30, 2026](https://developers.facebook.com/docs/video-api/guides/reels-publishing) |
| Permissions | `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`; Page token from a user with the CREATE_CONTENT task | same |
| Rate limit | **30 API-published reels per 24 h (moving window) per Page**, enforced on `POST /{page_id}/video_reels` | same |
| Specs | 9:16; 1080×1920 recommended (min 540×960); 24–60 fps; **duration 3–90 s** (≤60 s if also posted as a Page story); H.264/H.265 (VP9/AV1 OK); closed GOP 2–5 s; AAC-LC stereo 48 kHz, ≥128 kbps | same |
| Hosted-file upload | URL must allow the `facebookexternalhit/1.1` user agent; robots.txt blocks are rejected; fbcdn URLs are rejected | same |
| Scheduling | Reference lists `scheduled_publish_time` and `video_state` enum {DRAFT, PUBLISHED, SCHEDULED}. The allowed window for Reels is **not documented**; third-party guides say 10 min–29 days, and one vendor says Reels can't be scheduled. **Test on a test Page.** | [video_reels reference](https://developers.facebook.com/docs/graph-api/reference/page/video_reels); [postproxy (3rd-party)](https://postproxy.dev/blog/facebook-graph-api-posting-guide/) |
| AI flag | `is_ai_generated` (boolean): "self-claim whether the video was created with AI" | [video_reels reference](https://developers.facebook.com/docs/graph-api/reference/page/video_reels) |
| Copyright pre-check | `GET /{video_id}?fields=copyright_check_information` (needs `pages_read_engagement`) | [Reels guide](https://developers.facebook.com/docs/video-api/guides/reels-publishing) |
| Videos longer than 90 s (the 1–3 min format) | Use `POST /{page_id}/videos`. `scheduled_publish_time` must be **10 min–6 months** ahead. No `is_ai_generated` param is listed on this endpoint, so the label may have to be set in-app. | [Page Videos reference v26.0](https://developers.facebook.com/docs/graph-api/reference/page/videos/) |
| Context | Since mid-2025 all Facebook video uploads are presented as Reels, with no length limit in-app | [TechCrunch 2025-06-17](https://techcrunch.com/2025/06/17/facebook-announces-that-all-videos-on-its-platform-will-soon-be-shared-as-reels) |
| App Review | **Not needed for own Pages.** Standard Access is auto-granted and works for users who hold a role on the app. Advanced Access requires Business Verification plus App Review. | [Access Levels](https://developers.facebook.com/docs/graph-api/overview/access-levels/) |
| Live mode | Posts from an app in Development mode are visible only to app roles; switch the app to **Live** (third-party, from Postiz self-host docs) | [Postiz FB docs](https://docs.postiz.com/self-host/providers/facebook.md) |

### 1.2 Instagram Reels (Instagram API with Instagram Login or with Facebook Login)

| Item | Value | Source |
|---|---|---|
| Flow | `POST /{ig_id}/media` (`media_type=REELS`, `video_url` on a public server, or `upload_type=resumable` to rupload); poll `?fields=status_code` until `FINISHED`; then `POST /{ig_id}/media_publish` (`creation_id`) | [Content Publishing, updated Jun 30, 2026](https://developers.facebook.com/docs/instagram-platform/content-publishing) |
| Permissions | IG Login: `instagram_business_basic` + `instagram_business_content_publish`. FB Login: `instagram_basic`, `instagram_content_publish`, `pages_read_engagement` | same |
| Publish limit | **Conflicting on the same page:** the "Rate Limit" section says **100** API posts per 24 h, the carousel section says **50**. Check live usage via `GET /{ig_id}/content_publishing_limit`. | same |
| Container limits | Containers **expire after 24 h**; max **400 containers per 24 h** | [IG User Media ref, updated Sep 28, 2026](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media) |
| Reel specs | MP4/MOV with moov atom at front; H.264/HEVC; 23–60 fps; ≤25 Mbps; AAC ≤48 kHz; **3 s–15 min**; ≤300 MB; 9:16 recommended | same |
| Scheduling | **No native scheduling parameter.** Build your own queue and create the container shortly before publish time (it expires after 24 h). | Absent from Meta docs; confirmed by [postproxy (3rd-party)](https://www.postproxy.dev/how-to/schedule-instagram-reels/) |
| AI flag **[NEW-ish]** | `is_ai_generated=true` on container creation (both login types) | [Content Publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing); [IG User Media](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media) |
| Trial Reels | `trial_params.graduation_strategy` = `MANUAL` or `SS_PERFORMANCE`; shows only to non-followers first. Useful for testing hooks on new accounts. | same |
| Access | Standard Access is enough for own accounts; no login flow needed, only long-lived tokens (60 days, refreshable) | [IG Platform overview](https://developers.facebook.com/docs/instagram-platform/overview) |

### 1.3 YouTube Data API v3

| Item | Value | Source |
|---|---|---|
| Upload quota **[NEW]** | `videos.insert`: own bucket, **100 calls/day, 1 unit per call**; `search.list` likewise. All other methods share **10,000 units/day**. Resets at midnight PT. | [Quota Calculator, last updated 2026-09-15](https://developers.google.com/youtube/v3/determine_quota_cost); [videos.insert](https://developers.google.com/youtube/v3/docs/videos/insert) |
| History | 2025-12-04: upload cost cut from about 1,600 to about 100 units. **2026-06-01: granular quota buckets** for `videos.insert` and `search.list`. | [Revision history](https://developers.google.com/youtube/v3/revision_history) |
| Other relevant costs | `videos.update` 50, `thumbnails.set` 50, `captions.insert` 400, `playlistItems.insert` 50 | [Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost) |
| Private lock | *"All videos uploaded via videos.insert from unverified API projects created after 28 July 2020 will be restricted to private viewing mode"* until the project passes a ToS compliance audit (the "YouTube API Services – Audit and Quota Extension" form) | [videos.insert](https://developers.google.com/youtube/v3/docs/videos/insert) |
| Scheduling | `status.publishAt` (ISO 8601), allowed only while `privacyStatus=private` | [Videos resource](https://developers.google.com/youtube/v3/docs/videos) |
| AI disclosure | `status.containsSyntheticMedia` (boolean, settable on insert/update since 2024-10-30) | [Videos resource](https://developers.google.com/youtube/v3/docs/videos); [Revision history](https://developers.google.com/youtube/v3/revision_history) |
| Shorts classification | Square or vertical and **≤3 min** means a Short, for uploads on or after 2024-10-15. There is no API flag; it depends on the file. | [async.com (3rd-party citing Google)](https://async.com/blog/how-long-can-youtube-shorts-be/); [1of10](https://1of10.com/blog/how-long-can-youtube-shorts-be/) |
| OAuth gotcha | A consent screen left in "Testing" issues refresh tokens that expire after 7 days. Publish to "In production" (`youtube.upload` is a sensitive scope, so a verification prompt or warning may follow). | [Google OAuth setup doc](https://developers.google.com/health/setup) |
| Other [NEW] | 2026-08-27: public view counting aligned for all formats (YPP still uses engaged views). 2026-09-14: thumbnail max size 50 MB. | [Revision history](https://developers.google.com/youtube/v3/revision_history) |

Third-party reports say the audit takes "a few weeks" and wants screenshots, a demo account and a user-selectable privacy control. I found no firsthand report of a personal-use tool being approved, so treat YouTube direct API as **uncertain** for public posting. Low-medium confidence ([singhamandeep.com](https://singhamandeep.com/?p=1462)).

### 1.4 TikTok Content Posting API

| Item | Value | Source |
|---|---|---|
| Unaudited client | All posts `SELF_ONLY`; **max 5 users posting per 24 h**; target accounts must be private. Error `unaudited_client_can_only_post_to_private_accounts`. | [Content Sharing Guidelines, updated Aug 4, 2026](https://developers.tiktok.com/doc/content-sharing-guidelines); [Direct Post ref, updated Aug 24, 2026](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post) |
| Intended-use rule | **"Not acceptable: A utility tool to help upload contents to the account(s) you or your team manages."** Apps must target a wide audience, not internal or private use, so an audit for a personal studio is very likely to fail. | [Guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines) |
| Caps (all clients) | Per-creator Direct Post cap "typically around 15 posts per day per creator account", **shared across all API clients**; per-client active-creator cap; 6 requests/min per user token. Error `spam_risk_too_many_posts`. | same two |
| Required UX (for audit) | Show the creator nickname; privacy dropdown with **no default**; comment/duet/stitch toggles unchecked by default; Music Usage Confirmation text; commercial-content disclosure toggle; preview; explicit consent | [Guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines) |
| Fields | `title` ≤2,200 UTF-16 runes; `video_cover_timestamp_ms`; **`is_aigc` [NEW]** (adds a "Creator labeled as AI-generated" tag); `PULL_FROM_URL` needs a verified domain; upload_url valid 1 h | [Direct Post ref](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post) |
| Max length | Returned per creator by `creator_info/query` as `max_video_post_duration_sec` (example in docs: 300) | [Get Started – Direct Post](https://developers.tiktok.com/doc/content-posting-api-get-started) |
| Inbox / draft mode | `/v2/post/publish/inbox/video/init/` (`video.upload` scope) sends a draft to the user's TikTok inbox, and the human finishes posting in the app. Postiz says it is discarded if not finished in 24 h (3rd-party). | [Get Started – Upload](https://developers.tiktok.com/doc/content-posting-api-get-started-upload-content); [Postiz TikTok docs](https://docs.postiz.com/self-host/providers/tiktok.md) |
| Scheduling | **None in the API.** Use your own queue, an aggregator's scheduler, or TikTok Studio web scheduling (manual) | Absent from reference; [Creator Academy](https://www.tiktok.com/creator-academy/article/creator-rewards-program) mentions web scheduling |

### 1.5 Optional platforms
- **Threads:** 250 API posts per 24 h per profile; video up to 5 min; 9:16 recommended ([Threads API overview](https://developers.facebook.com/docs/threads/overview)). Cheap to add because it uses the same Meta app.
- **X:** pay-per-use became the default on 2026-02-06. About **$0.015 per post** created, $0.20 for a post with a URL (third-party; media upload billing unclear) ([outstand.so](https://www.outstand.so/blog/x-api-pricing); [docs.x.com](https://docs.x.com/x-api/introduction)). Low priority for this niche.
- **Pinterest:** Trial-access pins are sandboxed and visible only to the creator. Standard access needs a demo video *even for single-user apps* ([Pinterest access tiers](https://developers.pinterest.com/docs/key-concepts/access-tiers/)).

---

## 2. Aggregators (≈3 videos/day × 4 platforms ≈ 360 post actions/month per niche)

| Service | Plan that fits | Price | What you get | Handles app review/audit for you? | Source |
|---|---|---|---|---|---|
| **Upload-Post** | Basic | **$16/mo billed annually ($192/yr)**; vendor comparison page lists $24 monthly | Unlimited uploads; **5 profiles** (1 profile = 1 account per platform, so 1 per niche); TikTok, IG, YT, FB, Threads, X, Pinterest and more; scheduling; analytics; FFmpeg API 300 min/mo; MCP/n8n. Free tier: 10 uploads/mo, 2 profiles, **TikTok not in the free list**. | Yes: "You never create an app on TikTok, Meta…never wait for an app review"; claims verified app status | [pricing](https://www.upload-post.com/pricing); [comparison](https://www.upload-post.com/pricing-comparison) |
| **Zernio** (formerly **Late / getlate.dev**) | Build (usage-based) | 1–2 accounts free; 3–10 accounts **$6/mo each**; 11–100 $3/mo each. One niche on 4 platforms ≈ **$12/mo**; 3 niches (12 accounts) ≈ **$54/mo** | All features on every account, API, webhooks | Yes (hosted OAuth) | [pricing](https://zernio.com/pricing); rename: [everydev.ai](https://www.everydev.ai/tools/zernio) (Trustpilot users complain about price hikes after the rename) |
| **Postiz** (hosted) | Standard / Team / Pro | $29 (5 channels) / $39 (10) / $49 (30) per month; annual $23/$31/$39 | API + MCP + CLI on all plans; 7-day trial | Yes when hosted | [pricing](https://postiz.com/pricing) |
| **Postiz** (self-hosted, open source) | n/a | $0 software plus your server | You bring your own Meta, Google and TikTok apps | **No.** TikTok stays SELF_ONLY until *your* app is audited; the FB app must be Live; YouTube is private-locked until *your* project is audited | [TikTok](https://docs.postiz.com/self-host/providers/tiktok.md), [FB](https://docs.postiz.com/self-host/providers/facebook.md), [YouTube](https://docs.postiz.com/self-host/providers/youtube.md) |
| **Blotato** | Starter | $29/mo | 20 social accounts; social API (not included in the free trial); "up to 900 TikTok posts/month"; 1,250 AI credits | Yes | [pricing](https://www.blotato.com/pricing) |
| **Buffer** | Essentials | $5 per channel per month billed yearly (4 channels ≈ $20/mo) | API listed with 250 req/24 h and 7,500 per 30 days on Essentials. Free: 3 channels, 10 queued posts per channel. Whether the API can upload TikTok/YT video was **not verified**. | Yes | [pricing](https://buffer.com/pricing) |
| **Metricool** | Advanced (the API is Advanced-only) | from **$53/mo** annual ($67 monthly) | API (Zapier/Make); Starter ($20 annual / $25 monthly, 5 brands) has **no API** | Yes | [pricing](https://metricool.com/pricing/) |
| **Ayrshare** | Premium | **$149/mo** for 1 profile (Launch $299 for 10; Business $599 for 30) | Unlimited posts; 14+ networks | Yes | [pricing](https://www.ayrshare.com/pricing) |

**Recommendation for the <$100/mo budget:**
- Start with **Upload-Post Basic** (≈$16–24/mo; covers up to 5 niches on all 4 platforms, including public TikTok) or **Zernio** (≈$12/mo for niche 1).
- Wrap whichever you pick behind a `PublishingPort` interface in Spring, so you can later swap in direct Meta Graph or YouTube adapters for FB/IG/YT and keep the aggregator only for TikTok.
- Ayrshare and Metricool's API tier are over budget.
- Self-hosted Postiz does not solve TikTok or YouTube visibility.
- Vendor-dependency risk: Upload-Post and Zernio are small teams, so keep a manual-posting fallback.

---

## 3. Policies for AI-generated, faceless Bible/Catholic story channels

### 3.1 YouTube
- **Inauthentic content (renamed from "repetitious" on 2025-07-15).** Not monetizable:
  - "similar or repetitive content with low educational value… or minimal variation"
  - "characters put in the same situation over and over… highly similar storyline template"
  - **"Image slideshows, templated storylines, or scrolling text with minimal or no narrative"**
  - **"AI-generated content made with generic or unoriginal templates giving the impression of mass production without adding the creator's original, authentic insights."**
  - Allowed: the same intro/outro, and series with recurring characters where *each video has a distinct storyline*.
  - Reviewers look at the channel's main theme, most-viewed, newest, metadata and About section.
  - Source: [YouTube channel monetization policies](https://support.google.com/youtube/answer/1311392?hl=en)
- **Enforcement precedent:** Kapwing (Nov 2025) listed **Imperio de Jesús** (5.87M subs; AI Jesus "interactive quiz" videos) as the #2 AI-slop channel. By late January 2026 it was "no longer available on YouTube", among ≥16–18 removed or wiped channels ([Kapwing](https://www.kapwing.com/blog/ai-slop-report-the-global-rise-of-low-quality-ai-videos/); [Tubefilter](https://www.tubefilter.com/2026/01/29/youtube-ai-slop-channel-crackdown-bans/)). Third-party blogs add that the pattern was fully automated, multiple episodes a day and templated, and that a ~588K-sub Bible-stories channel was demonetized (low confidence, unverified) ([outlierkit](https://outlierkit.com/resources/youtube-ai-slop-crackdown-2026/)).
- **AI disclosure ("AI use" setting in Studio; `containsSyntheticMedia` in the API):**
  - **Required** for content that "Generates a realistic scene that didn't actually occur", which covers a photorealistic Jesus or biblical scene, and for AI music that is the main focus of the video.
  - **Not required** for non-realistic or animated content (e.g. "riding a unicorn through a fantastical world").
  - YouTube may auto-label via C2PA metadata or its own detection.
  - **"Disclosing AI content won't limit a video's audience or impact its eligibility to earn money."** Not disclosing can lead to removal or YPP suspension.
  - Implication: the "cinematic realistic" preset must set the flag; the Pixar and illustration presets usually do not.
  - Source: [YouTube Help – Disclosing use of GenAI content](https://support.google.com/youtube/answer/14328491?hl=en)
- **YPP thresholds:** 1,000 subscribers plus either 4,000 qualified watch hours in 12 months or **10M qualified Shorts views in 90 days**. Review takes about 1 month. **[NEW]** Updated YPP terms take effect 2027-02-01 and must be accepted by 2027-01-31 ([YPP overview](https://support.google.com/youtube/answer/72851?hl=en)). Vietnam is on the YPP country list ([availability](https://support.google.com/youtube/answer/7101720?hl=en)).

### 3.2 Meta (Facebook and Instagram)
- **Unoriginal content crackdown (2025-07-14):**
  - Targets repeated reposting of *others'* content: loss of monetization for a period plus reduced distribution on everything; duplicate videos are demoted.
  - Original AI content you produce is not the target.
  - Best practices: post original content; "avoid super short videos that offer viewers little value"; avoid third-party watermarks; captions with no links, minimal capitals and **≤5 hashtags**.
  - Source: [Meta for Creators blog](https://creators.facebook.com/blog/combating-unoriginal-content)
- **AI info label:**
  - Required for photorealistic video or realistic-sounding audio. The example explicitly includes *"A reel narrated with a realistic AI-generated voiceover."* Cartoon-style video does not need a label.
  - "There may be penalties for content shared without a label when it is required."
  - Labels are also auto-applied from C2PA/IPTC signals.
  - **So every TTS-narrated reel should be flagged** with `is_ai_generated=true`.
  - Source: [Meta Help Centre](https://www.meta.com/en-gb/help/artificial-intelligence/1783222608822690/)
- **[NEW] 2026-08-31:** Instagram renamed the optional "AI creator" account label to **"AI generated profile"**. It targets profiles that *feature an AI-generated person*, and reach is limited if such a profile is unlabeled. This matters only if a niche uses a recurring AI "host" persona (third-party news: [9to5google](https://9to5google.com/2026/08/31/instagram-ai-generated-influencers-label-update/); [SocialMediaToday](https://www.socialmediatoday.com/news/instagram-updates-tags-for-ai-profiles/829235/)).
- **Facebook Content Monetization:**
  - Invite-only; 70 eligible countries; residency and payout account must be in an eligible country; reels earn from 10 s.
  - **Vietnam reportedly not eligible** (third-party, checked 2026-09-18, citing Meta's Business Help Centre: [contentmonetizing.com](https://contentmonetizing.com/en/tiktok-monetization-countries/)).
  - Third-party guides agree AI tooling is not disqualifying in itself; originality is the test ([cinerads](https://www.cinerads.com/blog/facebook-ai-content-monetization-policy)).

### 3.3 TikTok
- **AIGC label:** realistic AI content must be labeled. Set `is_aigc=true` via the API ([Direct Post ref](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)). The detailed label rules here come from third-party guides that cite C2PA auto-detection (medium confidence) ([storrito](https://storrito.com/resources/tiktoks-2026-ai-labeling-rules-and-what-they-signal-for-platform-governance/)).
- **Creator Rewards Program:**
  - Eligibility: 8 countries; 18+; personal account; 10K followers and 100K views in 30 days; videos **over 1 minute** with ≥1,000 For You views; qualified views must come from the 8 countries.
  - Ineligible: "Unoriginal… minimal original input", **"Low quality: …low-quality images, or slide videos"**; 5 video violations in 30 days.
  - Source: [Creator Academy, updated Sep 10, 2026](https://www.tiktok.com/creator-academy/article/creator-rewards-program)
  - **Not available to a Vietnam-based creator.**

### 3.4 Operational risks: 2–3 AI videos/day on several new accounts
- **Account warm-up and server IP.** Only vendor or third-party opinion exists; there is no official guidance. Low confidence.
  - Common advice: watch and engage manually for 1–2 weeks before posting, ramp slowly, keep one consistent network and location per account, and avoid datacenter IPs *for logins and browser automation* ([influencermarketinghub](https://influencermarketinghub.com/tiktok-account-warm-up/); [gtrsocials](https://gtrsocials.com/blog/tiktok-and-instagram-automation-in-2026)).
  - Calling **official APIs** from a server is how every aggregator works and is the sanctioned path. The risk sits with unofficial or browser automation.
  - Recommendation: log in to each account only from the operator's normal device or residential connection, never automate logins, and use official APIs or an aggregator for posting.
- **Cadence.** Platform API caps are not the constraint:
  - FB: 30/day per Page
  - IG: 100 (or 50)/day
  - YouTube: 100 uploads/day per project
  - TikTok: ~15/day per creator
  - The constraint is the *channel-level inauthentic/templated review*. Suggested ramp (my recommendation): 1/day per platform for the first 2–4 weeks per new account; move to 2–3/day only if retention and engagement hold; rotate formats (see §4.4).
- **One set of accounts per niche** is fine and matches how aggregators bill (one "profile" per niche). Keep each niche's topic tight, because YouTube reviews the channel's "main theme".
- **Theology and accuracy.** Pray.com's *The AI Bible* uses pastors to write or review every script ([Christianity Today](https://www.christianitytoday.com/2025/09/ai-bible-pray-website-interview/)). For Catholic content (saints, deuterocanonical books) keep the human script gate even after auto-approve is enabled for visuals.

---

## 4. Reference format: Jesus Daily, and a format spec for niche 1

### 4.1 What could be verified about Jesus Daily (fetched 2026-10-09)
- **Page:** "Jesus Daily", verified, "(No Baby Blisters Charity)", Walkertown NC, **31,627,023 followers** ([Reels tab](https://www.facebook.com/JesusDaily/reels/)). A search snippet of the page listing shows an "AI content" label on its Solomon post (medium-low confidence).
- **The 10 most visible reels** (views / reactions / comments / shares; audio):

| Reel | Caption pattern | Views | React. | Comm. | Shares | Audio |
|---|---|---|---|---|---|---|
| [731966906200274](https://www.facebook.com/reel/731966906200274/) ("you-are-the-light-of-the-world-matthew-514") | Identity statement + CTA "Comment 'LIGHT'…" | 632K | 21K | 1.2K | 646 | Original audio |
| [849862374314525](https://www.facebook.com/reel/849862374314525/) | "HAPPY BIRTHDAY JESUS!!!" | 6.7M | 445K | 15K | 6.2K | Licensed: Ecklectic Music – *Silent Night (Analog Dream Version)* |
| [923891893660852](https://www.facebook.com/reel/923891893660852/) ("jesus-the-good-shepherd-john-1014") | (no caption) | 9.3M | 576K | 43.6K | 13K | Original audio |
| [1150154367678826](https://www.facebook.com/reel/1150154367678826/) | Question hook + 3-sentence Moses recap + "— Exodus 17:1–7" | 21K | 1.9K | 550 | 49 | Original audio |
| [1043735482044678](https://www.facebook.com/reel/1043735482044678/) | Question + #God #Jesus #galatians610 | 102K | 6.1K | 1.5K | 143 | Original audio |
| [1462944332363854](https://www.facebook.com/reel/1462944332363854/) | Question + #Jesus #God #ruth2 | 134K | 10K | 2.8K | 270 | Original audio |
| [1856509855731091](https://www.facebook.com/reel/1856509855731091/) | "What worry do you need to place in God's hands?" | 243K | 21K | 6.3K | 483 | Original audio |
| [1626500889263091](https://www.facebook.com/reel/1626500889263091/) | "Will you keep trusting God?" | 169K | 12K | 2.8K | 238 | Original audio |
| [4526813620868467](https://www.facebook.com/reel/4526813620868467/) | "Who could you show my love to today? ~Jesus" | 207K | 12K | 3.9K | 243 | Original audio |
| [1656453729387143](https://www.facebook.com/reel/1656453729387143/) | Solomon recap + "– 1 Kings 3:5–14" + reflective question | 161K | 9.6K | 2.2K | 231 | Original audio |

- **Patterns:**
  - Captions are a **second-person reflective question** ("What do you need God's help with today?"), plus a 1–3 sentence story recap, plus a **scripture reference**, plus sometimes a one-word comment CTA. Hashtags are minimal (0–3).
  - 9 of 10 reels use **"Original audio"**, meaning custom narration or music rather than trending sounds.
  - Reaction-to-view ratio is about **3.4–9%**; the typical reel gets 100–250K views, with occasional 6–9M breakouts on Christmas or iconic imagery (Good Shepherd).
- **Not verifiable:** duration, visual style, on-screen captions and posting frequency. The videos do not play without login, and a TinyFish browser run returned nothing. **Action: the operator should watch 5–10 recent reels while logged in and record duration, shot count, caption style, narration voice and whether Jesus speaks in first person.**

### 4.2 Comparable AI Bible operations and their workflows
- **The AI Bible (Pray.com):** >1M subs on YouTube + TikTok combined, 1.2M on IG (as of Sep 2025). Workflow:
  1. Pastor-written script (outlines with ChatGPT/Claude).
  2. Storyboard of about 60 scenes as **text-to-image (Midjourney/ChatGPT)**, defining start and end frames for color and character consistency.
  3. **Image-to-video** with prompted camera moves (push-in, aerial) and character actions.
  4. A pastor/theologian review layer.
  5. Data-driven A/B testing of art style; a "Final Fantasy"-like look won on shares and comments.
  6. 10-minute YouTube tests, then 4–5 episode character series (Ruth, Job).
  - Source: [Christianity Today, 2025-09-09](https://www.christianitytoday.com/2025/09/ai-bible-pray-website-interview/)
- **Creator tutorials and vendors** describe ChatGPT/Claude scripts, ElevenLabs narration, Midjourney or GPT-Image stills, Kling/Luma/Grok image-to-video for key shots, and CapCut for captions and assembly. All are marketing or third-party, low confidence ([filmora](https://filmora.wondershare.com/answers/how-to-make-faceless-youtube-videos-using-elevenlabs-capcut.html); [cliptalk](https://www.cliptalk.pro/bible-story-video-generator); [faceless.so](https://faceless.so/niche/bible-stories)).
- **Image + Ken Burns vs full AI video:** given the explicit YouTube "image slideshows" and TikTok "slide videos" exclusions, use a **hybrid**. Animate 30–60% of shots with image-to-video (hook shot, climax, key character moments) and use parallax or Ken Burns for the rest. Always pair visuals with a real narrative arc, not a verse over a still.

### 4.3 Proposed format spec: Niche 1 "Bible / Catholic Stories" (recommendation, derived from the sources above)

| Parameter | Spec | Why / source |
|---|---|---|
| Canvas | 1080×1920, 9:16, 30 fps constant, H.264 High, closed GOP ≈2 s, AAC-LC 48 kHz stereo 192 kbps, MP4 with faststart | Satisfies FB Reels, IG, Threads and TikTok specs ([FB](https://developers.facebook.com/docs/video-api/guides/reels-publishing), [IG](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media)) |
| SKU A "Reel" | **45–80 s** (hard cap 90 s), 8–14 shots | Fits the FB `video_reels` 3–90 s limit and IG/YT Shorts |
| SKU B "Story" | **65–170 s** (hard cap 175 s), 15–30 shots | Over 60 s meets TikTok CRP length; ≤3 min stays a YouTube Short; on FB use `/videos` because it is over 90 s |
| Structure | 0–2 s striking visual + spoken question hook (Jesus Daily style); 2–8 s context; story beats; turning point; on-screen scripture ref (e.g. "Exodus 17:1–7"); 1-line reflection; comment CTA ("Comment AMEN") | Mirrors the observed Jesus Daily captions |
| Narration | Warm, reverent US-English narrator (TTS); consistent voice per niche; avoid voicing Jesus as a real-person impersonation | Meta requires an AI label for realistic AI voiceover |
| Captions | Burned-in, 2–5 words per line, centered in the lower-middle safe zone, key-word highlight; no third-party watermark | Meta advice against watermarks ([Meta](https://creators.facebook.com/blog/combating-unoriginal-content)) |
| Music | Licensed or royalty-free instrumental (piano/strings/pads) ducked under VO; avoid copyrighted tracks (YT Shorts >1 min with any claim may be blocked, per a third-party summary of Google) and avoid AI music as the "main focus" unless disclosed | [YT AI disclosure](https://support.google.com/youtube/answer/14328491?hl=en); [async.com](https://async.com/blog/how-long-can-youtube-shorts-be/) |
| Visuals | Per-niche character sheet (Jesus, Mary, apostles), consistent costume and palette; hybrid stills + image-to-video; style preset fixed per niche | The AI Bible workflow; avoids the "slideshow" flag |
| Post copy | Question hook + 1–3 sentence recap + scripture ref + CTA; ≤3–5 hashtags; no links | Meta best practices; Jesus Daily pattern |
| AI flags | FB/IG `is_ai_generated=true`; TikTok `is_aigc=true`; YouTube `containsSyntheticMedia=true` for the realistic preset | Platform docs above |
| Variety guardrail | Rotate at least 4 series formats (Gospel story, Old Testament story, saint of the day, parable explained, verse reflection), vary hooks and openings, and run multi-episode arcs | YouTube "distinct storyline" allowance vs "same template" ban |
| Cadence | Weeks 1–4: 1/day per platform; then 2–3/day if retention holds; use IG Trial Reels to test hooks | Recommendation; IG `trial_params` exists |

### 4.4 Implications for the system design
- The scheduler must be **your own queue**, because IG and TikTok have no native scheduling. Use native scheduling only where it exists (FB `scheduled_publish_time`, YouTube `publishAt`). For IG, create the container shortly before publish because containers expire after 24 h.
- Keep per-account rate guards (FB 30 per 24 h per Page, IG 100 or 50, YT 100 uploads/day per project, TikTok ~15/day) and per-platform metadata (AI flags, scripture ref, hashtags).
- Route by duration: ≤90 s goes to FB `video_reels`; 91–180 s goes to FB `/videos`.
- Media must be on a **public HTTPS URL** that Meta can fetch (allow `facebookexternalhit`) and, for TikTok `PULL_FROM_URL`, on a domain you have verified. Cloudflare R2 or another object store with a public bucket fits.
