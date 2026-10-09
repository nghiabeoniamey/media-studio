# Media Studio: Tư vấn & quyết định kiến trúc

> Cập nhật: 2026-10-09. Tài liệu này tổng hợp 8 vòng hỏi đáp và một đợt nghiên cứu có kiểm chứng: 4 nhóm nghiên cứu, mỗi nhóm có một agent phản biện riêng.
> Số liệu gốc kèm nguồn (tiếng Anh) nằm ở [`docs/research/`](./research/). Giá thay đổi rất nhanh, nên trước khi nạp tiền hãy kiểm tra lại trang giá chính thức.

---

## 1. Yêu cầu đã chốt với bạn

| Hạng mục | Quyết định của bạn |
|---|---|
| Mục tiêu | Nuôi kênh riêng để kiếm tiền (không bán SaaS) |
| Thị trường | Tiếng Anh, khán giả US/global |
| Niche | Mỗi niche có **bộ tài khoản riêng** trên từng nền tảng. Niche 1 là Kinh Thánh, gồm **series Kitô giáo chung + series Công giáo riêng**. Sau này thêm mèo con 3D, tiểu sử minh hoạ… |
| Định dạng | 9:16, **chủ yếu < 60s**, thỉnh thoảng 1–3 phút |
| Sản lượng | 2–3 video/ngày/niche (sẽ tăng dần) |
| Ngân sách AI | < $100/tháng, **linh hoạt nếu có lý do** |
| Duyệt | Ban đầu duyệt kịch bản + video cuối, sau đó bật auto-approve theo niche |
| Phong cách | Preset theo niche: cinematic chân thực, 3D Pixar, tranh minh hoạ |
| Nhân vật | Mặc định theo niche, hoặc upload **ảnh hư cấu/AI/tranh vẽ** (không dùng mặt người thật). Chúa Giê-su theo **hình tượng truyền thống phương Tây** |
| Đầu vào câu chuyện | Nhập chủ đề · dán văn bản · AI tự lập lịch nội dung · link video tham khảo |
| Âm thanh | Narration TTS + nhạc nền + phụ đề động. **Giọng đọc chọn theo series**, kiểu phụ đề là preset theo niche |
| Thương hiệu | CTA nhẹ + logo nhỏ + intro/outro, **có tuỳ chọn xuất bản sạch** |
| Người dùng | Bạn + vài cộng tác viên (phân quyền admin/editor) |
| Thông báo/duyệt | Telegram bot + web dashboard |
| Lịch đăng | Khung giờ cố định theo niche (giờ ET). Video duyệt xong tự xếp vào slot trống |
| Nền tảng | Facebook Reels, Instagram Reels, YouTube Shorts, TikTok |
| Ưu tiên MVP | **Ra video đầu tiên nhanh nhất**, đăng tay từ file tải về. Auto-publish làm sau |
| Hạ tầng | Web app trên VPS. Chưa có GPU/VPS/domain/doanh nghiệp. Có Visa/Mastercard quốc tế |
| Kỹ thuật | Claude code toàn bộ, nên chọn stack tối ưu về kỹ thuật |
| Analytics | Làm sau khi có auto-publish |

---

## 2. Phát hiện quan trọng bạn cần biết trước

1. **Link reel bạn gửi không phải của Jesus Daily.** `facebook.com/reel/1645273697214268` là video của **Phạm Công Trúc**, hướng dẫn *"Cách làm ra một bộ phim AI chuyên nghiệp, giữ nguyên được nhân vật, góc máy…"*. Phần phân tích định dạng Jesus Daily bên dưới dựa trên 10 reel lấy từ tab Reels của page Jesus Daily.
2. **Ngân sách không đủ để video nào cũng là "full AI video".** Gen video AI cho mọi cảnh (S1) tốn tối thiểu khoảng **$155/tháng** cho 1 niche ở mức 2 video/ngày, mà đó là model rẻ nhất chưa kiểm chứng chất lượng. Nếu dùng model tốt thì lên **$350–1.400/tháng**. Xem mục 4.
3. **Từ Việt Nam, chỉ YouTube trả tiền.**
   - Facebook Content Monetization: Việt Nam **không có** trong danh sách 70 quốc gia. Đã kiểm tra trên trang chính thức của Meta.
   - TikTok Creator Rewards: chỉ mở cho creator cư trú tại 8 nước.
   - Vì vậy FB/IG/TikTok đóng vai trò kéo reach và phễu traffic. **Doanh thu quảng cáo chỉ đến từ YouTube (YPP)**.
4. **Rủi ro chính sách lớn nhất là YouTube "Generic/Repetitive Content".** Chính sách được tái cấu trúc ngày 13–16/07/2026. Nó nêu rõ *"image slideshows, templated storylines"* và *"AI-generated content made with generic or unoriginal templates"* là không được kiếm tiền. Tháng 1/2026, một kênh AI Jesus 5,87 triệu sub đã bị gỡ. Hệ thống vì thế phải đảm bảo:
   - cốt truyện gốc;
   - xoay vòng nhiều format series;
   - có chuyển động thật (hero clip);
   - có người duyệt kịch bản;
   - không đọc nguyên văn Kinh Thánh suông.
5. **Nhiều model đang thay đổi.**
   - Sora đã ngừng API (24/09/2026).
   - Veo 3.1 trên Gemini API tắt ngày **22/10/2026**.
   - Kling 4.0 chưa có API.
   - Wan 3.0 và Vidu Q4 vẫn ở trạng thái preview.

   → Mỗi lớp (video/ảnh/giọng/nhạc/LLM/đăng bài) đều phải dùng **adapter đổi được nhà cung cấp**.
6. **Đăng bài qua API chính thức có rào cản.**
   - TikTok: gần như không thể qua audit cho tool tự đăng lên tài khoản của chính mình.
   - YouTube: video upload qua API bị khoá ở chế độ private cho đến khi project Google Cloud qua audit, mất vài tuần.
   - Meta (FB/IG): đăng được cho tài khoản của chính bạn mà không cần App Review (cần test lại).

   → Phase 2 sẽ dùng aggregator **Upload-Post** ($16/tháng nếu trả theo năm), gói này bao gồm cả TikTok.

---

## 3. So sánh model gen video (đã kiểm chứng, 10/2026)

| Model | Giá ~720p/giây | Clip tối đa | Giữ nhân vật | Ghi chú | Đánh giá |
|---|---|---|---|---|---|
| **MiniMax H3 Max** | **$0.08** (768p, có audio); $0.05 ở 480p | 5–15s | ≤9 ảnh ref, first/last frame | #1 bảng xếp hạng image-to-video (Artificial Analysis), GA 08/2026 | ⭐ **Mặc định cho hero clip** |
| Gemini Omni 1.1 Flash | ~$0.10 (luôn có audio) | 10s, nối dài tới 40s | nhiều ảnh ref | Chặn ảnh người thật nhận diện được. GA 27/08 | Dự phòng cinematic |
| Wan 3.0 | $0.10 ($0.05 ở 480p) | 2–30s | ảnh/video/audio ref | Vẫn "preview", URL kết quả hết hạn sau 24h | Dự phòng cho cảnh dài |
| Kling 3.0 / O3 Std (fal) | $0.084 không audio | 3–15s | `elements` | Mạnh cho nhân vật stylized | ⭐ Niche mèo 3D |
| Kling 4.0 | chưa có API | 30s | ≤15 ref | Ra mắt 28/09, chờ API | Theo dõi |
| Seedance 2.5 | $0.23–0.47 | 4–30s | tới 50 ref | Chất lượng top nhưng đắt, từ chối mặt người thật | Không chọn (giá) |
| Grok Imagine 1.5 Lite | **$0.03** + $0.01/ảnh | 1–15s | không có ref | Rẻ nhất; vẫn tính tiền khi vi phạm policy | Sàn chi phí / b-roll |
| Veo 3.1 Fast/Lite | $0.03–0.10 | 4–8s | ≤3 ref, ảnh người lớn | Gemini API tắt 22/10. Vertex còn đến khoảng 17/11 | ❌ Tránh |
| Runway Gen-4.5 / Luma | $0.06–0.12 | — | — | Không lợi về giá | ❌ |
| Sora 2 | — | — | — | **Đã ngừng** | ❌ |

> Chưa có benchmark công khai nào cho phong cách Pixar-3D hay tranh vẽ. MVP có **chế độ A/B**: cùng một câu chuyện, gen bằng 2–3 model, rồi bạn chọn bằng mắt.
> Cần test riêng các cảnh nhạy cảm trên từng model trước khi dùng thật: Chúa Hài Đồng, bé Môi-se, cậu bé Đa-vít, cảnh đóng đinh.

---

## 4. Mô hình chi phí

### 4.1 Ba chiến lược sản xuất

Giả định: video 45 giây, hệ số gen lại 1.5×.

| Chiến lược | Cách làm | Chi phí/video | 60 video/tháng | 90 video/tháng |
|---|---|---|---|---|
| **S1: Full AI video** | Cả 9 cảnh đều gen video | $2.6 (Grok Lite) – $5.8 (H3 768p) | $155–349 | $232–524 |
| **S2: Hybrid "motion comic"** | 12 cảnh: 2 hero clip AI × 5s, 10 ảnh AI có Ken Burns/parallax | **$0.99 (Grok Lite) – $1.71 (H3 768p)** | **$59–103** | $89–154 |
| S2+: Hybrid nhiều chuyển động | ~40% thời lượng là video AI | ~$1.38 (Grok Lite) | $83 | $124 |
| S3: Tự host GPU | Wan 2.2 distilled trên RunPod RTX 5090 | ~$0.52 + $12/tháng cố định | $43 | $59 |

Các mức trên tính với Claude Sonnet Batch. Nếu dùng **Claude Opus 5.5** (mặc định đề xuất, chất lượng kịch bản cao hơn) thì cộng thêm khoảng $0.09–0.27/video, tức khoảng $5–16/tháng.

### 4.2 Đề xuất cho tháng đầu

Chỉ chạy niche Kinh Thánh, S2, 1 video/ngày, hero clip dùng H3 Max 768p:

| Khoản | Chi phí |
|---|---|
| Gen video + ảnh + giọng + nhạc | ≈ **$51** |
| LLM Opus 5.5 | ≈ $5–11 |
| Một lần: bake-off so sánh model | $10–25 |
| Một lần: thư viện nhân vật (Chúa Giê-su, Đức Mẹ, các tông đồ…) | $12–40 |
| Cố định: VPS | ~€6–8 |
| Cố định: domain | ~$1 |
| Phase 2: Upload-Post | $16–24 |

Retention tốt thì tăng lên 2/ngày, khi đó vẫn khoảng $76–103 với S2.

### 4.3 Khi thêm niche

Ngân sách $100 là **tổng cho mọi niche**. Muốn 3 niche × 2 video/ngày mà vẫn dưới $100 thì chỉ có S3 (tự host GPU) làm được. Đây là việc của Phase 4.

---

## 5. Stack model đề xuất theo niche

Mọi lựa chọn dưới đây đều đổi được trong phần cấu hình niche.

| Lớp | Kinh Thánh (cinematic) | Mèo con 3D | Tiểu sử minh hoạ |
|---|---|---|---|
| Video hero | MiniMax H3 Max → Gemini Omni → Wan 3.0 | Kling O3 Std (elements) → H3 Max ref | H3 Max 480p, chuyển động nhẹ |
| Video giá rẻ | H3 480p / Grok Lite | Grok Lite / PixVerse V6 → sau này LoRA tự host | Chủ yếu parallax |
| Character sheet | Nano Banana Pro ($0.134, Batch $0.067) | Nano Banana Pro | Nano Banana Pro + 3 ảnh style ref |
| Keyframe | Nano Banana 2.1 ($0.034, Batch $0.017, ≤4 ref nhân vật) | Nano Banana 2.1 | Nano Banana 2.1 / FLUX |
| Giọng đọc | Gemini 3.8 Flash TTS ($0.0135/phút, tăng gấp đôi từ 2027) → Cartesia ($5/tháng) / ElevenLabs | Tuỳ chọn | ElevenLabs / Gemini TTS |
| Nhạc | **Lyria 3.5** ($0.08/bài, tạo sẵn thư viện ~30 bài/niche). **Không dùng ElevenLabs Music**: điều khoản cấm tổ chức tôn giáo | Lyria / ElevenLabs Music | Lyria |
| LLM | **Claude Opus 5.5** ($4/$20 mỗi triệu token, Batch giảm 50%). Có thể đổi sang Sonnet 5.5 ($2/$10) để tiết kiệm | Haiku 5.5 / Sonnet 5.5 | Opus/Sonnet + web search để fact-check |
| Phụ đề | whisper.cpp qua `@remotion/install-whisper-cpp`, timestamp từng từ, chạy trên VPS, $0 | | |
| Nguồn Kinh Thánh | Public domain, lưu sẵn trong hệ thống: **BSB** (Berean Standard Bible, tiếng Anh hiện đại; mặc định cho series chung), **KJV**, **Douay-Rheims (DRC)** và **CPDV** (Công giáo, có đủ sách Đệ Nhị Luật). Tránh NIV. ESV chỉ trong giới hạn cho phép | | |

---

## 6. Kiến trúc kỹ thuật

### 6.1 Vì sao chọn TypeScript thay vì Java Spring + Next.js

- Spring + Next.js vốn đã là 2 ngôn ngữ. Lõi giá trị của chiến lược S2 nằm ở **khâu dựng video**: parallax, Ken Burns, phụ đề động, overlay câu Kinh Thánh, intro/outro. **Remotion** (React) là công cụ tốt nhất cho việc này, và nó miễn phí cho cá nhân/công ty ≤3 người, cho phép tự động hoá.
- SDK chính thức của các nhà cung cấp AI (Anthropic, Google GenAI, fal, MiniMax qua REST) và whisper.cpp đều tích hợp tốt nhất với Node.
- Một ngôn ngữ duy nhất thì ít ma sát hơn: chia sẻ type và schema (Zod) giữa UI, worker và template render.
- Java chỉ đáng chọn nếu bạn muốn tự bảo trì bằng Java. Trường hợp đó vẫn phải có sidecar Node cho Remotion.

### 6.2 Sơ đồ

```
                ┌───────────────────── VPS (Docker Compose) ─────────────────────┐
 Bạn/CTV ──────▶│  apps/web (Next.js)     apps/worker (Node + DBOS)   render     │
 (web/mobile)   │  - Niche/Series/Nhân vật  - Workflow bền vững        (Remotion  │
 Telegram ◀────▶│  - Nhập câu chuyện        - Gọi provider AI          + Chrome  │
                │  - Duyệt kịch bản/video   - Retry, idempotency       headless, │
                │  - Lịch/slot đăng         - Trần ngân sách           ffmpeg,   │
                │  - Cost dashboard         - Lên lịch đăng            whisper)  │
                │            └──────── Postgres (dữ liệu + trạng thái workflow) ┘│
                └──────────────────────────────┬──────────────────────────────────┘
                                               │
      Cloudflare R2 (media, custom domain) ◀───┤
      Provider AI: Anthropic · Google (Nano Banana, TTS, Lyria, Omni) · MiniMax · xAI · fal
      Publisher (Phase 2): Upload-Post · Meta Graph · YouTube Data API
```

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Monorepo | pnpm workspaces: `apps/web`, `apps/worker`, `packages/{core,db,providers,render,bible}` | Modular monolith, 2 process, không microservices |
| Workflow | **DBOS Transact (TS)**: workflow bền vững lưu trên Postgres, có queue với giới hạn concurrency, lịch chạy, sleep bền, chờ tín hiệu duyệt | Không cần thêm server (khác Temporal/Trigger.dev), $0 |
| DB | Postgres 16 + Drizzle ORM | JSONB cho prompt/tham số model |
| Lưu trữ | Cloudflare R2, custom domain (bắt buộc cho TikTok `PULL_FROM_URL` và để Meta fetch được) | Không tính phí egress. Lifecycle tự xoá file trung gian sau 14–30 ngày |
| Render | Remotion + FFmpeg; container riêng, concurrency 1–2 | 1080×1920, 30fps; xuất 2 bản: có brand và sạch |
| Auth | Better Auth (email/password), role admin/editor | |
| Telegram | grammY: gửi preview kèm nút Duyệt / Gen lại cảnh / Từ chối | |
| Hosting | Contabo Cloud VPS 6 (6 vCPU/12GB, ~€6–8/tháng). Benchmark render trước khi trả trước dài hạn | Hetzner đã tăng giá mạnh |
| Backup | `pg_dump` hằng đêm → R2 | |

### 6.3 Pipeline cho mỗi video

1. **Nhận đầu vào:** chủ đề, văn bản dán vào, mục trong lịch nội dung, hoặc link tham khảo. Link tham khảo chỉ được phân tích cấu trúc/hook/nhịp, không tái sử dụng nội dung.
2. **Nghiên cứu:** Claude tra cứu bản Kinh Thánh public domain lưu sẵn trong máy, sau đó tạo *story brief* gồm: trích dẫn, ghi chú thần học, cờ cảnh nhạy cảm (trẻ em, bạo lực).
3. **Kịch bản:**
   - hook 0–2s;
   - lời kể khoảng 110 từ cho 45s;
   - tham chiếu Kinh Thánh trên màn hình;
   - câu suy niệm;
   - CTA nhẹ;
   - tiêu đề, caption, hashtag (≤5) cho từng nền tảng.
4. **Shot list:** chia cảnh theo nhịp kể. Mỗi cảnh có loại (hero/still), chuyển động máy, nhân vật, bối cảnh, prompt. **Bộ phân bổ ngân sách** giới hạn số giây hero theo chiến lược của niche.
5. **🔒 Gate 1 (duyệt kịch bản)** trên web/Telegram. Bước này bỏ qua nếu niche đã bật auto-approve. Series Công giáo nên luôn giữ gate này.
6. **Character sheet:** lấy từ thư viện; nhân vật mới thì gen 6 góc nhìn bằng Nano Banana Pro.
7. **Keyframe:** dùng Nano Banana 2.1 với ≤4 ảnh tham chiếu nhân vật + style preset. Có QA tuỳ chọn: Claude xem ảnh để kiểm tra có khớp prompt và nhân vật.
8. **Hero clip:** image-to-video từ keyframe. Nếu bị chặn hoặc lỗi thì **tự fallback sang Ken Burns** trên chính keyframe đó, để không tốn thêm tiền gen lại.
9. **Âm thanh:**
   - TTS bằng giọng của series;
   - nhạc lấy từ thư viện Lyria;
   - whisper.cpp căn timestamp từng từ.
10. **Render Remotion:** dùng preset phụ đề của niche, overlay câu Kinh Thánh, logo/intro/outro, xuất bản sạch.
11. **🔒 Gate 2 (duyệt video):**
    - Duyệt;
    - Gen lại từng cảnh cụ thể;
    - Từ chối.
    - Ở chế độ A/B: xem các phương án cạnh nhau, có hiển thị chi phí của từng phương án.
12. **Xuất bản:**
    - MVP: tạo gói tải về (mp4, caption.txt, hashtag, tiêu đề) để bạn đăng tay hoặc đặt lịch trong Meta Business Suite / YouTube Studio / TikTok Studio.
    - Phase 2: tự xếp vào slot trống theo giờ ET rồi đăng qua adapter. Luôn bật cờ AI: `is_ai_generated`, `containsSyntheticMedia`, `is_aigc`.

### 6.4 Mô hình dữ liệu chính

| Bảng | Nội dung |
|---|---|
| `users` | role: admin, editor; được gán theo niche |
| `niches` | style preset, nhân vật mặc định, preset phụ đề, brand kit, chiến lược sản xuất mặc định, cấu hình provider, **trần ngân sách tháng**, cờ auto-approve, slot giờ đăng |
| `series` | thuộc niche; format template, giọng đọc, bản dịch Kinh Thánh, tần suất |
| `characters` | ảnh tham chiếu, character sheet, mô tả. Sau này có LoRA |
| `stories` | nguồn: topic / text / calendar / reference_url; trạng thái |
| `videos` | state machine: draft → researching → script_review → generating → final_review → approved → scheduled → published; có thể có biến thể A/B |
| `scripts` | có version |
| `shots` | loại, prompt, keyframe, clip, provider, số lần thử |
| `assets` | R2 key, loại, provider, chi phí, metadata |
| `reviews` | gate, quyết định, ghi chú, người duyệt, kênh: web/telegram |
| `publish_jobs` | nền tảng, tài khoản, slot, trạng thái, id bài đăng bên ngoài, cờ AI |
| `cost_ledger` | provider, model, đơn vị, chi phí ước tính/thực tế, video, niche. Dùng để chặn khi chạm trần |
| `calendar_entries` | Phase 3: lịch Phụng vụ / chủ đề tuần |

### 6.5 Mã nguồn mở tham khảo

Chỉ mượn ý tưởng, không bê nguyên.

| Dự án | License | Lấy gì |
|---|---|---|
| ViMax | MIT | Prompt agent để trích xuất nhân vật và dựng storyboard |
| Verticals | MIT | Khái niệm "niche profile" |
| MoneyPrinterTurbo | MIT | Căn thời gian phụ đề |
| Remotion `template-tiktok` | — | Phụ đề kiểu TikTok |
| ArcReel, Postiz | **AGPL** | Chỉ đọc để tham khảo, không copy code |

---

## 7. Đăng bài & chính sách

| Nền tảng | Đường đi | Giới hạn chính | Doanh thu từ VN |
|---|---|---|---|
| Facebook Reels | Upload-Post → adapter Meta trực tiếp | 3–90s; 30 reel/ngày/Page qua API | ❌ (chỉ reach) |
| Instagram Reels | Upload-Post → Meta trực tiếp | Container hết hạn sau 24h; không có lịch đăng native | ❌ |
| YouTube Shorts | Upload-Post → API trực tiếp sau khi qua audit | Shorts ≤3 phút; 100 upload/ngày/project; `publishAt` | ✅ **YPP**: 1.000 sub + 4.000 giờ xem, hoặc 10 triệu view Shorts trong 90 ngày |
| TikTok | Upload-Post (lâu dài) hoặc đăng tay | ~15 bài/ngày; API chưa audit chỉ đăng được private | ❌ |

**Quy tắc nội dung hệ thống sẽ tự áp dụng:**
- Cốt truyện kể lại theo cách riêng. Trích Kinh Thánh nằm *bên trong* câu chuyện, không làm video chỉ đọc nguyên văn.
- Xoay vòng ≥4 format series để tránh bị coi là "templated".
- Mỗi video có ≥2 hero clip chuyển động.
- Không tạo "AI pastor" đưa lời khuyên đời sống/sức khoẻ: chính sách YouTube về AI persona trong chủ đề nhạy cảm.
- Chỉ dùng nhạc tự gen, để tránh Content ID chặn các Shorts dài hơn 1 phút.
- CTA nhẹ ("Follow for daily Bible stories"), tránh kiểu engagement-bait. Tối đa 5 hashtag. Không gắn watermark của bên thứ ba.
- Mặc định **luôn khai báo AI** trên mọi nền tảng. YouTube xác nhận việc khai báo không làm giảm phân phối hay khả năng kiếm tiền.

**Định dạng tham chiếu Jesus Daily:**
- Page có khoảng 31,6 triệu follower; mỗi reel thường được 100–250K view.
- Caption theo công thức: câu hỏi suy ngẫm → tóm tắt truyện 1–3 câu → trích dẫn Kinh Thánh → CTA bình luận.
- 9/10 reel dùng "Original audio".

---

## 8. Lộ trình

| Phase | Nội dung | Người làm |
|---|---|---|
| **0. Chuẩn bị** | Tạo FB Page, IG Professional, kênh YouTube, TikTok cho niche 1 · mua domain · tạo API key: Anthropic, Google AI Studio (Gemini), MiniMax, Cloudflare R2, Telegram BotFather · thuê VPS | **Bạn** (tôi gửi checklist chi tiết) |
| **1. MVP: video đầu tiên** | Monorepo, DB, auth/phân quyền · cấu hình niche/series/nhân vật · pipeline từ bước 1→11 · chế độ A/B · cost ledger + trần ngân sách · Telegram duyệt · xuất gói đăng tay · Docker Compose + deploy VPS · provider giả lập để test không tốn tiền | Claude |
| **2. Auto-publish** | Adapter Upload-Post (cả 4 nền tảng) · adapter Meta trực tiếp · YouTube trực tiếp (sau audit) · xếp slot theo giờ ET · cờ AI | Claude |
| **3. Thông minh hơn** | Lịch nội dung AI (lịch Phụng vụ cho series Công giáo, ngày lễ) · kéo analytics và gợi ý chủ đề/hook · auto-approve có QA tự động | Claude |
| **4. Mở rộng** | Niche 2: mèo con 3D (Kling O3) · worker GPU tự host (RunPod, Wan 2.2/LTX + LoRA) để giảm chi phí khi nhiều niche · niche tiểu sử | Claude |

### Lịch hạn cần nhớ

| Ngày | Sự kiện |
|---|---|
| 2026-10-22 | Veo 3.1 + `gemini-omni-flash-preview` tắt trên Gemini API |
| 2026-11-17 | Gemini TTS bản preview tắt; Vertex Veo 3.1 có thể retire |
| 2027-01-01 | Giá Gemini Flash / Flash TTS tăng gấp đôi |
| 2027-01-31 | Hạn chấp nhận điều khoản YPP mới (hiệu lực 01/02/2027) |

---

## 9. Rủi ro chính & cách giảm

| # | Rủi ro | Giảm thiểu |
|---|---|---|
| 1 | Ngân sách không theo kịp sản lượng | Trần ngân sách cứng theo niche · bắt đầu 1/ngày · thêm GPU tự host trước khi thêm niche |
| 2 | YouTube demonetize hoặc gỡ kênh (nguồn tiền duy nhất) | Cốt truyện gốc · nhiều format · hero motion · giữ gate kịch bản |
| 3 | Nhà cung cấp thay đổi/ngừng model | Adapter · ghim model ID · mỗi lớp có ≥2 model đã kiểm chứng |
| 4 | Bộ lọc nội dung chặn cảnh Kinh Thánh (trẻ em, đóng đinh) | Bộ prompt test nhạy cảm cho từng model · LLM kiểm tra trước khi gọi · fallback Ken Burns |
| 5 | Nhân vật không nhất quán trong dàn cast lớn | Thư viện character sheet · image-to-video từ keyframe · LoRA sau này |
| 6 | Sai thần học / vi phạm bản quyền bản dịch | Chỉ dùng bản public domain · series Công giáo luôn có người duyệt |
| 7 | Phụ thuộc aggregator đăng bài | Interface Publisher · luôn giữ phương án đăng tay |

---

## 10. Quyết định bổ sung (sau vòng nghiên cứu)

| Câu hỏi | Quyết định |
|---|---|
| Video tham khảo (Phạm Công Trúc) | Học **kỹ thuật giữ nhân vật và góc máy**. Hệ thống được thiết kế quanh kỹ thuật này: thư viện character sheet 6 góc, ảnh tham chiếu bối cảnh, ngôn ngữ máy quay thống nhất (cỡ cảnh, góc, ống kính, chuyển động, quy tắc 180°), tái dùng setup cũ (`matchSetupOf`), nối khung cuối clip trước (`continueFrom`), hero clip luôn là image-to-video từ keyframe |
| Nguồn thu | **YouTube là kênh chính** (YPP). FB/IG/TikTok đăng chéo để kéo reach |
| LLM | **Cấu hình theo niche/series**. Mặc định Claude Opus 5.5 (effort high); đổi sang Sonnet 5.5 / Haiku 5.5 trong phần cài đặt niche |
| Bắt đầu code | Bắt đầu MVP ngay; bạn chuẩn bị tài khoản/API key song song theo [`SETUP.md`](./SETUP.md) |

### Câu hỏi còn mở

Không chặn MVP.

1. Ai duyệt nội dung thần học cho series Công giáo? Mặc định series này luôn bắt buộc duyệt kịch bản.
2. Có để Chúa Giê-su nói ở ngôi thứ nhất không? Mặc định: không, chỉ kể chuyện ở ngôi thứ ba.
3. Có chấp nhận chờ tối đa khoảng 24h cho bản gen đầu (Batch API, giảm 50% chi phí ảnh/LLM) không? Mặc định: không, gen ngay.
