# Media Studio

Studio tự động sản xuất video ngắn bằng AI cho kênh riêng (đa niche, mỗi niche có bộ tài khoản riêng). Luồng chính: câu chuyện + nhân vật → AI nghiên cứu → kịch bản & shot list → keyframe + hero clip → giọng đọc, nhạc, phụ đề → render → duyệt (web/Telegram) → lên lịch đăng Facebook Reels, Instagram Reels, YouTube Shorts, TikTok.

Niche đầu tiên: truyện Kinh Thánh (series Kitô giáo chung + series Công giáo).

## Tài liệu

- [`docs/DECISIONS.md`](docs/DECISIONS.md): tư vấn, quyết định kiến trúc, so sánh model, mô hình chi phí, lộ trình (tiếng Việt).
- [`docs/SEO_CONTENT.md`](docs/SEO_CONTENT.md): thương hiệu từng chủ đề (logo trong [`brand/`](brand/)), SEO video, nội dung chân thật để giữ điều kiện kiếm tiền.
- [`docs/research/`](docs/research/): báo cáo nghiên cứu gốc kèm nguồn và bảng kiểm chứng (2026-10-09, tiếng Anh).

## Trạng thái

Đã xong: core, db, storage, providers, render, bible, Docker. Chưa làm: worker, web. Xem [`docs/HANDOFF.md`](docs/HANDOFF.md) để tiếp tục.
