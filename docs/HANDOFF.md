# Bàn giao: trạng thái dự án và cách tiếp tục trên máy desktop

> Cập nhật 2026-10-09. Phiên cloud dừng sớm vì sắp hết ngân sách token.
> Đọc theo thứ tự: file này → [DECISIONS.md](./DECISIONS.md) → [ARCHITECTURE.md](./ARCHITECTURE.md) → [SETUP.md](./SETUP.md) → [SEO_CONTENT.md](./SEO_CONTENT.md) (thương hiệu, SEO, nội dung chân thật).

## 1. Trạng thái từng phần

| Phần | Trạng thái | Test |
|---|---|---|
| `docs/` (tư vấn, nghiên cứu có nguồn, kiến trúc, setup) | ✅ Xong | — |
| `packages/core`: schema Zod, interface provider, bảng giá, phân bổ hero clip, ước tính chi phí, bộ dựng prompt giữ nhân vật/góc máy, căn thời gian narration, lịch đăng ET, state machine, hợp đồng LLM/workflow/render | ✅ Xong | 22/22 pass |
| `packages/db`: Drizzle schema + migration, auth (scrypt, session), cost ledger chống ghi trùng, chuyển trạng thái, seed niche Kinh Thánh | ✅ Xong | 5/5 pass (Postgres thật) |
| `packages/storage`: local + S3/Cloudflare R2 | ✅ Xong | 4/4 pass |
| Docker (`docker/`, `docker-compose.yml`, Caddy HTTPS) | ✅ Viết xong, **chưa build thử** | — |
| `packages/providers`: adapter Anthropic, Google, MiniMax, xAI, fal, ElevenLabs + mock | ✅ Xong: `createProviderRegistry` (provider thật chỉ bật khi có key, luôn có `mock`), `catalog()`; adapter vendor **chưa thử với API thật** (chỉ test bằng fetch giả) | 14/14 pass |
| `packages/render`: Remotion StoryVideo (Ken Burns, clip, phụ đề, verse, brand), ffmpeg helpers, alignWords | ✅ Xong: render thật 1080x1920 có âm thanh (~60–95 s cho 6,6 s video trên 4 CPU); `pnpm --filter @media-studio/render preview` tạo video mẫu; `install-whisper` cài whisper.cpp | 10/10 pass (gồm 1 lần render thật) |
| `packages/bible`: kho Kinh Thánh BSB/KJV/DRC/CPDV + tra cứu + chỉ mục truyện | ✅ Xong: `pnpm --filter @media-studio/bible fetch-data` tải 4 bản (BSB/KJV 66 sách, DRC/CPDV 73 sách); `parseReference`, `getPassage` (tự ánh xạ số Thánh Vịnh sang Vulgate cho DRC/CPDV), `suggestPassages` với 192 truyện | 27/27 pass |
| `apps/worker`: pipeline DBOS, Telegram bot, xếp lịch, xuất gói | 🔴 Chưa làm | — |
| `apps/web`: dashboard Next.js tiếng Việt | 🔴 Chưa làm | — |

### 1b. Ghi chú cho providers + render

- Chạy preview: `REMOTION_BROWSER_EXECUTABLE=<đường dẫn Chrome/Chromium> pnpm --filter @media-studio/render preview`. Kết quả nằm ở `packages/render/data/preview-*.mp4`. Bỏ trống biến này nếu máy có mạng: Remotion sẽ tự tải Chrome Headless Shell.
- Việc chưa làm:
  - ~~Thẻ câu Kinh Thánh chồng lên thẻ outro~~: render tự cắt verse tại thời điểm outro bắt đầu (`verseWindow`). Worker vẫn nên đặt verse trước outro để hiển thị trọn vẹn.
  - Có thể ẩn phụ đề khi outro bắt đầu.
  - Thử từng adapter vendor với API key thật: Anthropic, Gemini (ảnh, TTS, Lyria, Omni), MiniMax, xAI, fal, ElevenLabs. Hình dạng request/response được viết theo tài liệu đã nghiên cứu, nhưng **chưa gọi API thật lần nào**.

### 1c. Rà soát ngày 2026-10-09 (providers, render, bible)

| Hạng mục | Kết quả |
|---|---|
| Adapter Anthropic | Cả 5 schema pipeline chuyển được sang structured output. Gửi đúng adaptive thinking, effort, refusal fallback (không gửi cho Haiku). Refusal → `blocked`, sai schema / JSON hỏng → `retryable`. Model fallback lạ được ghi $0 kèm cảnh báo, không văng lỗi. Có test với client giả |
| Adapter Google | Dùng Interactions API của `@google/genai` 2.x, khớp typings của SDK. TTS bọc PCM 24 kHz thành WAV. **Chưa gọi API thật** |
| Server render | Chỉ nghe 127.0.0.1, mỗi file một token ngẫu nhiên, hỗ trợ Range/HEAD, không lộ file ngoài danh sách |
| Lỗi đã sửa | Gradient ffmpeg của mock (`speed=0`); verse chồng outro; `bible` cache vĩnh viễn lần đọc thất bại; script `fetch` trùng lệnh có sẵn của pnpm (đổi thành `fetch-data`) |
| Còn lại | Thử từng adapter vendor với API key thật. Thánh Vịnh có câu tiêu đề có thể lệch 1 số câu ở bản DRC/CPDV |

## 2. Spec chi tiết cho phần còn lại

[`docs/handoff/build-workflow.js`](./handoff/build-workflow.js) chứa **spec đầy đủ bằng tiếng Anh cho 5 package** (providers, render, bible, worker, web). Đó chính là prompt đã giao cho các agent: phạm vi, API dùng chung giữa các package, yêu cầu test, chi tiết từng bước pipeline và từng trang web. Hai cách dùng:

- **Với Claude Code trên desktop:** mở repo rồi nói
  *"Đọc docs/HANDOFF.md và docs/handoff/build-workflow.js, hoàn thành package <tên> theo spec"*. Làm lần lượt từng package theo thứ tự ở mục 3. Nếu bật ultracode/workflow, có thể chạy lại script đó, nhưng nên giảm còn 1–2 package mỗi lần.
- **Tự code:** đọc phần `TASKS` trong file, mỗi task là một checklist.

Hợp đồng bắt buộc giữa các package nằm trong `packages/core/src/contracts.ts` và mục "AGREED CROSS-PACKAGE APIS" trong file spec.

## 3. Thứ tự làm tiếp (khuyến nghị)

1. ~~providers~~ ✅ (còn: thử với API key thật).
2. ~~bible~~ ✅
3. ~~render~~ ✅
4. **worker** (thêm: chạy `lintPlatformMeta` sau bước kịch bản, dùng `buildYoutubeDescription` khi xuất gói — xem SEO_CONTENT.md mục 5):
   - pipeline `produceVideo` 15 bước (ARCHITECTURE.md), `ensureCharacterSheet`, `buildMusicLibrary`;
   - Telegram (grammY), lịch nhắc đăng bài, xuất gói zip;
   - test DBOS end-to-end với provider mock.
5. **web:**
   - đăng nhập, cài đặt niche/series/nhân vật, tạo câu chuyện (+ A/B), trang video có 2 cổng duyệt, so sánh A/B, chi phí, người dùng + mã Telegram;
   - `src/server/gateway.ts` gọi DBOSClient đúng tên trong contracts.
6. **Chạy end-to-end bằng mock:** seed `--mock` → tạo câu chuyện trên web → worker chạy đến `scheduled` → kiểm tra file mp4.
7. **Chuyển sang provider thật:** điền API key, seed không có `--mock`, chạy bake-off A/B (SETUP.md mục 6).

## 4. Chạy trên máy desktop

Yêu cầu: Node 22, pnpm 10, Postgres 16, ffmpeg; Chrome/Chromium cho Remotion.

```bash
git clone https://github.com/nghiabeoniamey/media-studio.git && cd media-studio
git checkout claude/peaceful-mendel-xhvicy
pnpm install
cp .env.example .env          # giữ trống API key để dùng mock

# Postgres: tạo user/db (hoặc chỉ chạy service postgres trong docker compose)
createuser -s media && psql -c "alter user media password 'media'"
createdb -O media media_studio && createdb -O media media_studio_test && createdb -O media media_studio_dbos

pnpm db:migrate
pnpm db:seed -- --mock
pnpm typecheck
DATABASE_URL_TEST=postgres://media:media@localhost:5432/media_studio_test pnpm test
```

Lưu ý:
- `apps/worker`, `apps/web` hiện chỉ là thư mục rỗng.
- Lần đầu chạy trên máy: `pnpm --filter @media-studio/bible fetch-data` để tải kho Kinh Thánh (~36 MB, không commit vào git).

## 5. Những điều cần nhớ

- Model dùng thật đã kiểm chứng ngày 2026-10-09 (`packages/core/src/pricing.ts`, `presets.ts`):
  - Claude `claude-opus-5-5` / `claude-sonnet-5-5` / `claude-haiku-5-5`;
  - Google `gemini-nano-banana-2.1`, `gemini-3-pro-image`, `gemini-3.8-flash-tts`, `lyria-3.5`, `gemini-omni-1.1-flash`;
  - MiniMax `MiniMax-H3-Max`;
  - xAI `grok-imagine-video-1.5-lite`;
  - fal Kling `fal-ai/kling-video/o3/standard/reference-to-video`.
- **Veo 3.1 trên Gemini API tắt ngày 22/10/2026.** Đừng dùng.
- Ngân sách: trần theo tháng cho mỗi niche nằm trong `niches.settings.monthlyBudgetUsd`, chặn bằng `checkBudget` + `cost_ledger`.
- Kỹ thuật giữ nhân vật/góc máy nằm ở `packages/core/src/prompts.ts`:
  - `selectKeyframeReferences`, `buildKeyframePrompt`, `buildMotionPrompt`, `kenBurnsFor`;
  - hero clip luôn là image-to-video từ keyframe.
- Code đã có trên GitHub (nhánh `claude/peaceful-mendel-xhvicy`).

## 6. Phương án dự phòng: git bundle

Code được gửi kèm dạng **git bundle** (`media-studio.bundle`). Trên máy desktop:

```bash
git clone media-studio.bundle media-studio
cd media-studio
git checkout claude/peaceful-mendel-xhvicy
git remote set-url origin https://github.com/nghiabeoniamey/media-studio.git
git push -u origin claude/peaceful-mendel-xhvicy
```

## 7. Ước lượng token / chi phí để hoàn thành

**Cách ước lượng.** Dựa trên số đo thật của 2 agent đã chạy trong phiên cloud, dùng Claude Opus 5.5:

| Agent | Kết quả | Token đã xử lý | Chi phí API tương đương |
|---|---|---|---|
| `providers` | ~3.100 dòng, chưa có test | ~51M token. Đa số là cache read do agent phải đọc lại ngữ cảnh dài ở mỗi lượt | ≈ $18–20 |
| `render` | ~2.600 dòng, chưa có test | ~24M token | ≈ $10 |

Tức là khoảng **15–17M token xử lý, tương đương ~$5–7, cho mỗi 1.000 dòng code**. Con số này đã gồm thời gian đọc tài liệu, thử lệnh và sửa lỗi.

**Phần còn lại:**

| Hạng mục | Khối lượng ước tính | Token xử lý | Chi phí (Opus 5.5) |
|---|---|---|---|
| providers: registry + test | ~800 dòng | 10–15M | $5–8 |
| render: test, preview, kiểm tra hình | ~600 dòng | 8–12M | $4–7 |
| bible: tải dữ liệu, parser, chỉ mục ≥150 truyện, test | ~1.200 dòng | 12–18M | $5–8 |
| worker: pipeline 15 bước DBOS, Telegram, lịch, export, test E2E | ~4.000 dòng | 60–90M | $20–35 |
| web: Next.js tiếng Việt, ~10 trang, auth, gateway, test, build, screenshot | ~6.000 dòng | 80–120M | $30–50 |
| Ghép nối + chạy end-to-end bằng mock + sửa lỗi | — | 25–40M | $10–20 |
| Review code + sửa | — | 20–30M | $8–15 |
| **Tổng** | **~12.600 dòng** | **~215–325M** (output thật chỉ ~3–5M) | **≈ $80–145** |

**Cách giảm chi phí khi code trên desktop:**
1. **Làm tuần tự từng package trong một phiên**, không chạy nhiều agent song song. Mỗi agent song song đều phải đọc lại toàn bộ ngữ cảnh, nên đây là phần tốn nhất.
2. **Mỗi package một phiên ngắn**, bắt đầu bằng:
   > "Đọc docs/HANDOFF.md, docs/ARCHITECTURE.md và spec của package X trong docs/handoff/build-workflow.js, rồi hoàn thành X"

   Commit xong thì mở phiên mới. Ngữ cảnh ngắn thì cache read ít hơn.
3. **Cân nhắc dùng Claude Sonnet 5.5** (giá bằng khoảng một nửa Opus 5.5) cho phần nhiều code lặp như các trang web, test, chỉ mục truyện Kinh Thánh. Giữ Opus 5.5 cho worker pipeline và tích hợp. Ước tính tổng giảm còn **≈ $55–100**.
4. Tự viết những phần đơn giản: danh sách 150 truyện Kinh Thánh, chuỗi giao diện tiếng Việt. Để Claude lo phần logic khó: pipeline, render, gateway.

Đây là chi phí **viết code**. Chi phí **chạy** studio (gen video) nằm riêng ở DECISIONS.md mục 4: khoảng $51–103/tháng cho 1 niche.
