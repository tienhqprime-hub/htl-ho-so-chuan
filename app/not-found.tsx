import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="shell narrow">
      <section className="panel" style={{ textAlign: 'center', padding: '64px 28px' }}>
        <div className="eyebrow">HTL HỒ SƠ CHUẨN</div>
        <p style={{ margin: '8px 0 0', fontSize: 72, fontWeight: 900, lineHeight: 1, color: '#17345f' }}>404</p>
        <h1>Không tìm thấy trang anh/chị cần mở.</h1>
        <p className="leadResult muted" style={{ maxWidth: 620, margin: '0 auto 28px' }}>
          Đường dẫn có thể đã thay đổi hoặc nội dung không còn tồn tại. Anh/chị có thể quay về trang chủ hoặc mở công cụ kiểm tra tài liệu.
        </p>
        <div className="actions" style={{ justifyContent: 'center' }}>
          <Link className="primary" href="/">Về trang chủ</Link>
          <Link className="primary secondary" href="/kiem-tra">Kiểm tra tài liệu</Link>
        </div>
      </section>
    </main>
  );
}
