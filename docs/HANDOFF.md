# Bàn giao: trạng thái dự án và cách tiếp tục trên máy desktop

> Cập nhật 2026-10-09. Phiên cloud dừng sớm vì sắp hết ngân sách token.
> Đọc theo thứ tự: file này → [DECISIONS.md](./DECISIONS.md) → [ARCHITECTURE.md](./ARCHITECTURE.md) → [SETUP.md](./SETUP.md).

## 1. Trạng thái từng phần

| Phần | Trạng thái | Test |
|---|---|---|
| `docs/` (tư vấn, nghiên cứu có nguồn, kiến trúc, setup) | ✅ Xong | — |
| `packages/core`: schema Zod, interface provider, bảng giá, phân bổ hero clip, ước tính chi phí, bộ dựng prompt giữ nhân vật/góc máy, căn thời gian narration, lịch đăng ET, state machine, hợp đồng LLM/workflow/render | ✅ Xong | 22/22 pass |
| `packages/db`: Drizzle schema + migration, auth (scrypt, session), cost ledger chống ghi trùng, chuyển trạng thái, seed niche Kinh Thánh | ✅ Xong | 5/5 pass (Postgres thật) |
| `packages/storage`: local + S3/Cloudflare R2 | ✅ Xong | 4/4 pass |
| Docker (`docker/`, `docker-compose.yml`, Caddy HTTPS) | ✅ Viết xong, **chưa build thử** | — |
| `packages/providers`: adapter Anthropic, Google, MiniMax, xAI, fal, ElevenLabs + mock | 🟡 **Dở dang**: đã có adapter + mock; **thiếu `src/registry.ts`** (`createProviderRegistry`) nên còn 1 lỗi typecheck; **chưa có test** | — |
| `packages/render`: Remotion StoryVideo (Ken Burns, clip, phụ đề, verse, brand), ffmpeg helpers, alignWords | 🟡 **Dở dang**: typecheck sạch; **chưa có test, script preview, install-whisper**; chưa render thử lần nào | — |
| `packages/bible`: kho Kinh Thánh BSB/KJV/DRC/CPDV + tra cứu + chỉ mục truyện | 🔴 Chưa làm | — |
| `apps/worker`: pipeline DBOS, Telegram bot, xếp lịch, xuất gói | 🔴 Chưa làm | — |
| `apps/web`: dashboard Next.js tiếng Việt | 🔴 Chưa làm | — |

## 2. Spec chi tiết cho phần còn lại

[`docs/handoff/build-workflow.js`](./handoff/build-workflow.js) chứa **spec đầy đủ bằng tiếng Anh cho 5 package** (providers, render, bible, worker, web). Đó chính là prompt đã giao cho các agent: phạm vi, API dùng chung giữa các package, yêu cầu test, chi tiết từng bước pipeline và từng trang web. Hai cách dùng:

- **Với Claude Code trên desktop:** mở repo rồi nói
  *"Đọc docs/HANDOFF.md và docs/handoff/build-workflow.js, hoàn thành package <tên> theo spec"*. Làm lần lượt từng package theo thứ tự ở mục 3. Nếu bật ultracode/workflow, có thể chạy lại script đó, nhưng nên giảm còn 1–2 package mỗi lần.
- **Tự code:** đọc phần `TASKS` trong file, mỗi task là một checklist.

Hợp đồng bắt buộc giữa các package nằm trong `packages/core/src/contracts.ts` và mục "AGREED CROSS-PACKAGE APIS" trong file spec.

## 3. Thứ tự làm tiếp (khuyến nghị)

1. **providers:**
   - viết `src/registry.ts`: `createProviderRegistry({ env, fetch })` đăng ký provider có API key, luôn có `mock`, cùng `catalog()`;
   - viết test cho mock (ffprobe kiểm tra media thật) và cho adapter (mock fetch).
2. **bible:**
   - viết `scripts/fetch.ts`, tải từ `raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/{BSB,KJV,DRC,CPDV}.json`;
   - viết `parseReference`, `getPassage`, `suggestPassages` (≥150 truyện), kèm test.
3. **render:**
   - viết test render 6 giây (bản có brand và bản sạch), script `preview`, script `install-whisper`;
   - xem thử vài frame để kiểm tra phụ đề và Ken Burns.
4. **worker:**
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
- `packages/providers` sẽ báo lỗi typecheck cho đến khi có `src/registry.ts`.
- `packages/bible`, `apps/worker`, `apps/web` hiện chỉ là thư mục rỗng.

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
- Push lên GitHub từ cloud bị lỗi 403: Claude GitHub App chưa có quyền ghi vào repo. Xem mục 6.

## 6. Nếu repo trên GitHub chưa có code

Code được gửi kèm dạng **git bundle** (`media-studio.bundle`). Trên máy desktop:

```bash
git clone media-studio.bundle media-studio
cd media-studio
git checkout claude/peaceful-mendel-xhvicy
git remote set-url origin https://github.com/nghiabeoniamey/media-studio.git
git push -u origin claude/peaceful-mendel-xhvicy
```
