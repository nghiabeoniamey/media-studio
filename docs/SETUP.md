# Phase 0: Checklist chuẩn bị (bạn làm song song khi tôi code)

Thứ tự: làm từ trên xuống. Phần nào chưa xong vẫn chạy được hệ thống ở **chế độ mock**: mọi bước tạo media giả lập miễn phí, dùng để thử giao diện và quy trình.

## 1. Tài khoản mạng xã hội cho niche 1 (Kinh Thánh)

| Nền tảng | Việc cần làm | Lưu ý |
|---|---|---|
| YouTube | Tạo kênh mới bằng một Google account riêng cho niche | Settings → Upload defaults: **Altered or synthetic content = Yes**; Audience: **Not made for kids**. Đây là kênh kiếm tiền chính (YPP) |
| Facebook | Tạo **Facebook Page** (không dùng trang cá nhân), dùng Meta Business Suite | Bật nhãn **AI info** khi đăng. Từ VN chưa kiếm tiền được trên FB, chủ yếu kéo reach |
| Instagram | Tài khoản **Professional (Creator)**, liên kết với Page ở trên | Bật **AI label** khi đăng |
| TikTok | Tài khoản mới, chuyển sang Business/Creator | Bật **AI-generated content** khi đăng |

- Tuần 1–4: mỗi nền tảng 1 bài/ngày, sau đó mới tăng.
- Dùng cùng tên, avatar và bio cho cả 4 nền tảng.
- Không mua follow, không dùng nhiều tài khoản trên cùng một thiết bị/IP một cách bất thường.

## 2. Tên miền + Cloudflare (lưu trữ video)

1. Mua tên miền (~$10/năm), trỏ DNS về Cloudflare (gói miễn phí).
2. Cloudflare → **R2** → tạo bucket, ví dụ `media-studio`.
3. Gắn **custom domain** cho bucket, ví dụ `media.tenmien.com`. Bắt buộc, vì TikTok và Meta chỉ lấy video từ domain bạn sở hữu.
4. Tạo **R2 API token** (Object Read & Write), lưu lại `Access Key ID`, `Secret Access Key` và `Account ID`.

## 3. API key

| Dịch vụ | Dùng cho | Lấy ở đâu | Bắt buộc? |
|---|---|---|---|
| Anthropic | Nghiên cứu, kịch bản, shot list | console.anthropic.com → API Keys (nạp $10–20) | Có |
| Google AI Studio (Gemini API) | Ảnh nhân vật/keyframe (Nano Banana), giọng đọc (Gemini TTS), nhạc (Lyria), video dự phòng (Omni) | aistudio.google.com → Get API key. **Bật billing**, vì Omni và Lyria cần gói trả phí | Có |
| MiniMax | Hero clip chính (H3 Max) | platform.minimax.io → API keys (nạp ~$20) | Có |
| xAI | Video giá rẻ dự phòng (Grok Imagine Lite) | console.x.ai | Tuỳ chọn |
| fal.ai | Kling (cho niche mèo 3D sau này) | fal.ai/dashboard/keys | Tuỳ chọn |
| ElevenLabs | Giọng đọc cao cấp (nếu Gemini TTS chưa đạt) | elevenlabs.io | Tuỳ chọn |
| Telegram | Bot duyệt video trên điện thoại | Chat với **@BotFather** → `/newbot` → lấy token | Nên có |

Mọi key chỉ đặt trong file `.env` trên VPS. Không gửi key qua chat.

## 4. VPS

- Gợi ý: **Contabo Cloud VPS 6** (6 vCPU / 12 GB RAM, ~€6–8/tháng), Ubuntu 24.04, khu vực Singapore hoặc US.
- Cài Docker: `curl -fsSL https://get.docker.com | sh`
- Trỏ DNS `studio.tenmien.com` về IP của VPS (bản ghi A).

## 5. Triển khai

Sau khi tôi hoàn thành MVP:

```bash
git clone <repo> media-studio && cd media-studio
cp .env.example .env        # điền key ở bước 2–3, APP_BASE_URL=https://studio.tenmien.com
docker compose up -d --build
docker compose exec worker pnpm db:migrate
docker compose exec worker pnpm db:seed            # niche Kinh Thánh với provider thật
ADMIN_PASSWORD='mật-khẩu-dài' docker compose exec -e ADMIN_PASSWORD worker pnpm --filter @media-studio/db create-admin ban@email.com "Tên bạn"
```

Mở `https://studio.tenmien.com`, đăng nhập, vào **Người dùng → Kết nối Telegram** và gửi mã cho bot.

## 6. Tuần đầu: so sánh model (bake-off, ~$10–25)

1. Tạo 5 câu chuyện thử, mỗi câu bật **A/B** với 3 model video: MiniMax H3 Max · Gemini Omni 1.1 Flash · Grok Imagine Lite.
2. Bắt buộc thử các cảnh nhạy cảm: Chúa Hài Đồng, bé Môi-se, cậu bé Đa-vít, cảnh đóng đinh (nên chỉ gợi tả).
3. Chọn model thắng trong trang **So sánh A/B**, rồi đặt làm mặc định trong cài đặt niche.
4. Nghe thử giọng đọc. Nếu chưa ưng, đổi voice trong cài đặt series.
