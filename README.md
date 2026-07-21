# HTL HỒ SƠ CHUẨN — Pilot 1.0

Công cụ AI hỗ trợ kiểm tra toàn diện hồ sơ hoặc tài liệu khi người dùng thấy chưa rõ ràng, chưa chắc chắn hoặc có dấu hiệu đáng nghi.

## Phạm vi bản Pilot

- Một Chủ sở hữu trực tiếp vận hành.
- Tải tối đa 8 tệp mỗi phiên, tổng tối đa 30 MB.
- Hỗ trợ PDF, JPG, PNG, WEBP và TXT.
- AI đối chiếu tên, số, ngày tháng, số liệu, thành phần hồ sơ và mâu thuẫn nội bộ.
- Kết quả gồm trạng thái, mức tin cậy, phát hiện, bằng chứng, nguồn, khuyến nghị, giới hạn và bước tiếp theo.
- In hoặc lưu báo cáo thành PDF bằng trình duyệt.
- Không kết luận pháp lý tuyệt đối và không tự khẳng định tài liệu giả.

## Công nghệ

- Next.js 14 + TypeScript
- Vercel
- OpenAI Responses API
- Structured Outputs JSON Schema
- Supabase schema đã chuẩn bị cho giai đoạn lưu lịch sử và đăng nhập

## Chạy thử trên máy

```bash
npm install
cp .env.example .env.local
npm run dev
```

Mở `http://localhost:3000`.

Nếu chưa có `OPENAI_API_KEY`, ứng dụng tự chạy chế độ minh họa để kiểm tra giao diện.

## Biến môi trường

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Triển khai Vercel

1. Tạo repository GitHub mới tên `htl-ho-so-chuan` dưới tài khoản chủ sở hữu.
2. Đưa toàn bộ mã nguồn trong thư mục này lên repository.
3. Trong Vercel chọn **Add New > Project** và import repository.
4. Thêm `OPENAI_API_KEY` và `OPENAI_MODEL` trong **Settings > Environment Variables**.
5. Nhấn Deploy.
6. Khi có tên miền HTL, thêm tại **Settings > Domains**.

Tên tạm đề xuất: `htl-ho-so-chuan.vercel.app`.

## Supabase

File `supabase/schema.sql` là nền tảng lưu phiên kiểm tra, tài liệu và phát hiện. Bản mã hiện tại ưu tiên xuất bản nhanh nên chưa bắt buộc Supabase để chạy chức năng AI. Điều này giúp app không bị chặn khi chưa tạo dự án cơ sở dữ liệu.

Khi bật lưu lịch sử:

1. Tạo Supabase project.
2. Chạy `supabase/schema.sql` trong SQL Editor.
3. Thêm các biến môi trường Supabase vào Vercel.
4. Bật Auth và Storage theo chính sách RLS.

## Nguyên tắc vận hành

- Chỉ tải lên hồ sơ cần làm rõ.
- Không tải dữ liệu trái phép hoặc bí mật không có quyền xử lý.
- Người vận hành phải xác nhận kết quả trước khi sử dụng.
- Kết quả AI không thay thế giám định, công chứng, cơ quan phát hành hoặc tư vấn pháp lý.

## Chủ sở hữu

**Anh Hoàng Quốc Tiến** — Chủ sở hữu, Chủ sản phẩm và Người vận hành Pilot.
