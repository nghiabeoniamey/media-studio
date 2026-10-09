# Thương hiệu, SEO video và nội dung chân thật

> Cập nhật 2026-10-09.
> Mục tiêu: video được tìm thấy (SEO), người xem thật sự xem hết (retention), và kênh **giữ được điều kiện kiếm tiền** từ quảng cáo YouTube (YPP). Từ Việt Nam, đây là nguồn doanh thu quảng cáo duy nhất (xem DECISIONS.md).

## 1. Thương hiệu cho từng chủ đề

Logo vector nằm ở [`/brand`](../brand). Sửa `brand/build.py` rồi chạy `python3 brand/build.py && bash brand/render.sh` để xuất lại PNG.

| Thương hiệu | Phạm vi | Ý nghĩa logo | Màu |
|---|---|---|---|
| **Shepherd's Lamp**: "Bible stories, brought to light" | Niche 1: truyện Kinh Thánh (bộ tài khoản riêng) | Đèn dầu cổ (Thánh Vịnh 119:105, "lời Chúa là đèn soi bước chân tôi") + hào quang | Navy `#13213B` + vàng `#E3B04B` |
| **Saints & Faith**: "Catholic stories of holiness" | Series Công giáo **trong** niche 1 (huy hiệu series, dùng chung kênh) | Hoa hồng (Đức Mẹ, Mân Côi) + thánh giá | Xanh thẫm `#1C2E57` + vàng `#D9B45A` |
| **Whisker Tales**: "Cozy 3D kitten adventures" | Niche mèo 3D (phase 4) | Mèo con mắt to, phong cách 3D dễ thương | Kem `#FFF3DF` + cam `#F29A2E` |
| **Lives in Ink**: "Illustrated stories of remarkable people" | Niche tiểu sử minh hoạ (phase 4) | Bút lông chim + giọt mực | Than `#1E2227` + nâu sepia `#C9A27C` |

**File cho mỗi thương hiệu:**

| File | Kích thước | Dùng cho |
|---|---|---|
| `avatar.png` | 1024×1024 | Ảnh đại diện YouTube/FB/IG/TikTok. Hình tròn, an toàn khi các nền tảng cắt tròn |
| `watermark.png` | 256×256 | Logo góc video. Tải lên phần cài đặt niche → Brand kit → logo; renderer tự chèn với độ mờ 0.7 |
| `lockup.png` | 1800×600 | Banner, thẻ intro/outro, ảnh bìa Facebook (cắt theo tỉ lệ từng nền tảng) |
| `*.svg` | — | Bản gốc vector, chỉnh sửa trong Figma/Illustrator |

**Trước khi dùng tên:**
1. Kiểm tra tên/handle còn trống trên cả 4 nền tảng, ví dụ `@shepherdslamp`.
2. Tra nhanh nhãn hiệu (USPTO TESS / WIPO Global Brand Database) để tránh trùng với thương hiệu đã đăng ký.
3. Không dùng tên, logo hay cách trình bày giống Jesus Daily hay page lớn khác, vì Meta xếp nội dung bắt chước vào nhóm "unoriginal".

## 2. Điều kiện kiếm tiền: nội dung phải "chân thật", không "rập khuôn"

YouTube tái cấu trúc chính sách kiếm tiền ngày 13–16/07/2026 ([YouTube policy](https://support.google.com/youtube/answer/1311392?hl=en), [TechCrunch](https://techcrunch.com/2026/07/20/youtube-clarifies-policies-around-ai-slop-and-upsetting-videos/)). AI **được phép** nếu con người thật sự định hướng sáng tạo ([eMarketer](https://www.emarketer.com/content/youtube-s-new-rules-favor-original-creators-over-ai-generated-filler), [exchange4media](https://www.exchange4media.com/digital-news/youtubes-july-15-monetization-overhaul-originality-is-the-new-currency-145145.html)). Không được kiếm tiền nếu thuộc các nhóm sau:
- *Generic/Repetitive*: "image slideshows, templated storylines", nội dung AI làm theo khuôn mẫu cho cảm giác sản xuất hàng loạt;
- chỉ đọc lại văn bản có sẵn bằng TTS;
- AI persona đưa lời khuyên về chủ đề nhạy cảm.

Hậu quả có thể là **mất kiếm tiền cả kênh**, không chỉ một video. Meta (03/2026) cũng hạ phân phối các page đăng nội dung "unoriginal", kể cả kiểu *"narrating what's already on screen without adding anything meaningful"* ([Meta](https://about.fb.com/news/2026/03/rewarding-original-creators-on-facebook/)).

**Checklist cho mỗi video.** Hệ thống đã gắn các quy tắc này vào prompt và bộ kiểm tra; người duyệt dùng checklist khi bấm Duyệt.

- [ ] **Kể lại bằng lời của mình**, kèm bối cảnh lịch sử/văn hoá và *vì sao câu chuyện còn ý nghĩa hôm nay*. Không đọc nguyên văn Kinh Thánh trên nền ảnh.
- [ ] Có **câu hỏi suy ngẫm** hoặc góc nhìn riêng ở cuối, không chỉ "kết thúc truyện".
- [ ] **Ít nhất 2 hero clip chuyển động** (S2) và nhịp cắt đa dạng; không phải slideshow ảnh tĩnh.
- [ ] Xoay vòng **≥4 format series**: kể chuyện, dụ ngôn, chân dung nhân vật, thánh trong ngày, suy niệm một câu. Không lặp một khuôn tiêu đề/mở bài.
- [ ] Chi tiết **tưởng tượng được ghi rõ** ("as the story is often imagined"). Không bịa lời Chúa/Chúa Giê-su.
- [ ] **Không engagement bait**: không "Type Amen", "Share to be blessed", "Don't scroll past", không doạ hay gây cảm giác tội lỗi.
- [ ] **Bật nhãn AI** trên mọi nền tảng (YouTube *Altered or synthetic content*, Meta *AI info*, TikTok *AI-generated*). YouTube xác nhận việc khai báo không làm giảm phân phối hay kiếm tiền ([YouTube](https://support.google.com/youtube/answer/14328491?hl=en)).
- [ ] Mô tả có câu minh bạch: *"Visuals and narration are made with AI tools; every story is researched, written and reviewed by our team."* (`buildYoutubeDescription` tự thêm câu này).
- [ ] Nhạc do hệ thống tự tạo (Lyria). Không dùng nhạc có Content ID, vì Shorts dài hơn 1 phút có claim sẽ bị chặn toàn cầu.

## 3. SEO theo nền tảng

Phần lớn nguồn dưới đây là blog của các công ty công cụ, không phải tài liệu chính thức. Coi chúng là quy tắc kinh nghiệm và đo lại bằng số liệu của chính kênh.

| Yếu tố | YouTube Shorts | Facebook / Instagram Reels | TikTok |
|---|---|---|---|
| Tiêu đề | ≤100 ký tự, lý tưởng 40–70; **từ khoá chính trong 40 ký tự đầu**; không viết HOA toàn từ, không clickbait ([vidIQ](https://www.vidiq.com/blog/post/youtube-seo/), [Metadata Reactor](https://metadatareactor.com/blog/youtube-shorts-seo-guide/)) | Không có tiêu đề riêng: **125 ký tự đầu của caption** là phần xem trước và tìm kiếm ([inro](https://www.inro.social/blog/instagram-seo-guide-2026)) | Caption đọc như câu tìm kiếm ([Noqta](https://noqta.tn/en/tutorials/social-search-seo-tiktok-instagram-optimization-2026)) |
| Mô tả/caption | Câu 1 = chuyện gì xảy ra + tên truyện + câu Kinh Thánh; 2–3 câu bối cảnh; trích dẫn; series; câu minh bạch AI ([ClipSpeed](https://www.clipspeed.ai/blog/youtube-shorts-seo-optimization-guide.html)) | Từ khoá tự nhiên trong 2 câu đầu, kết bằng câu hỏi suy ngẫm (thúc đẩy bình luận thật) | Như Reels, ngắn hơn |
| Hashtag | 2–3 trong mô tả (#Shorts tuỳ chọn); hashtag giúp phân loại, không tăng thứ hạng | 3–5 hashtag cụ thể; Meta khuyến nghị ≤5 | 3–5 |
| Lời nói + chữ trên màn hình | **Câu đầu tiên nói tên truyện/nhân vật**; phụ đề luôn bật (nhiều người xem không tiếng) | Instagram được cho là index cả chữ trên màn hình và audio ([Planoly](https://planoly.com/blog/how-to-use-keywords-on-instagram)) | Nói và hiện từ khoá trong 3 giây đầu |
| Tín hiệu xếp hạng | Khung hình đầu, tỉ lệ xem hết, tỉ lệ vuốt qua, loop; Shorts feed dựa trên chất lượng, Search dựa trên metadata | Watch time, save, share ([TrueFuture](https://www.truefuturemedia.com/articles/instagram-reach-2026-algorithm-reels-carousels-caption-seo)) | Watch time, tỉ lệ xem lại |
| Đo lường | YouTube Studio → nguồn traffic "YouTube search" trong 28 ngày; trên ~10% là SEO đang hiệu quả (quy tắc kinh nghiệm) | Insights: reach từ non-followers | Search views |

**Nghiên cứu từ khoá (miễn phí, 10 phút/tuần):**
1. Gõ tên truyện vào ô tìm kiếm YouTube/TikTok và ghi lại các gợi ý tự động. Ví dụ "moses strikes the rock" → "...meaning", "...why was he punished".
2. Xem 5 video đứng đầu, ghi lại cụm từ chung trong tiêu đề và chữ trên màn hình.
3. Ưu tiên câu hỏi người ta thật sự tìm, ví dụ "Why couldn't Moses enter the promised land", để làm video "giải thích". Loại này có lượt tìm kiếm ổn định lâu dài.
4. Bám **lịch Phụng vụ / ngày lễ** (Mùa Chay, Phục Sinh, Giáng Sinh, lễ các thánh). Lượt tìm kiếm tăng mạnh vào các ngày đó, nên đăng trước 3–7 ngày.

## 4. Mẫu nội dung (niche Shepherd's Lamp)

**Công thức tiêu đề** (từ khoá trước, cảm xúc sau):
- `Moses Strikes the Rock | Water in the Desert`
- `The Prodigal Son | A Father Who Runs`
- `Why Did Jesus Weep? | The Raising of Lazarus`
- `Saint Thérèse's Little Way | Saints & Faith`

**Mô tả YouTube** (do `buildYoutubeDescription` tạo):

```
Moses strikes the rock at Rephidim and water pours out for a thirsty people (Exodus 17:1-7).

Israel camps in the desert with no water... (2-3 câu bối cảnh bằng lời của mình, vì sao còn ý nghĩa hôm nay)

Scripture: Exodus 17:1-7 (BSB)

Part of our series "Bible Stories".

Visuals and narration are made with AI tools; every story is researched, written and reviewed by our team.

#BibleStory #Moses #Exodus
```

**Caption FB/IG/TikTok:** câu tóm tắt có tên truyện → 1 câu hỏi suy ngẫm thật ("When have you felt thirsty for hope?") → trích dẫn → 3–5 hashtag. Đây là câu hỏi mời bình luận thật, không phải yêu cầu gõ "Amen".

**Bình luận ghim:** câu Kinh Thánh đầy đủ + một câu hỏi + link playlist series.

**Thói quen kênh:**
- Mỗi series là một **playlist**.
- Đăng **khung giờ cố định**: 07:30 và 19:30 giờ ET (đã cấu hình sẵn).
- Trả lời bình luận thật trong giờ đầu tiên.
- Khung hình đầu là cảnh hero có chuyển động, kèm chữ tên truyện ở vùng an toàn.

## 5. Phần đã đưa vào code

| Ở đâu | Làm gì |
|---|---|
| `packages/core/src/seo.ts` | `SEO_WRITING_RULES` (đưa vào prompt viết kịch bản); `lintPlatformMeta` kiểm tra tiêu đề/caption/hashtag, phát hiện engagement bait, clickbait, từ khoá ở sai vị trí; `buildYoutubeDescription` |
| `packages/core/src/presets.ts` | Niche Kinh Thánh dùng màu và outro "Shepherd's Lamp"; `contentRules` gồm luật nội dung + luật SEO; `BRAND_IDENTITIES` liệt kê 4 thương hiệu |
| `brand/` | Logo SVG/PNG + script xuất lại |

**Việc cho worker (chưa làm):**
- Sau bước viết kịch bản, chạy `lintPlatformMeta`. Có lỗi mức `error` (bait, quá nhiều hashtag) thì viết lại kịch bản kèm danh sách lỗi. Lỗi mức `warn` thì hiển thị cho người duyệt.
- Dùng `buildYoutubeDescription` khi xuất gói đăng bài.
