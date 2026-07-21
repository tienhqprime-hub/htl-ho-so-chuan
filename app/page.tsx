import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="brand">HTL HỒ SƠ CHUẨN</div>
          <div className="tagline">Trợ lý AI kiểm chứng hồ sơ cần làm rõ</div>
        </div>
        <span className="pilot">PILOT 1.0</span>
      </header>

      <section className="hero">
        <div className="eyebrow">KIỂM TRA KHI CÓ NGHI NGỜ</div>
        <h1>Đưa hồ sơ chưa rõ vào app.<br/>Nhận một góc nhìn có căn cứ.</h1>
        <p>
          Hệ thống đọc, đối chiếu và chỉ ra điểm phù hợp, điểm mâu thuẫn,
          thông tin còn thiếu và nội dung cần xác minh thêm.
        </p>
        <Link className="primary" href="/kiem-tra">Bắt đầu kiểm tra hồ sơ</Link>
      </section>

      <section className="grid">
        <article className="card"><strong>01</strong><h3>Tải hồ sơ</h3><p>Một hoặc nhiều tài liệu liên quan đến cùng một vấn đề.</p></article>
        <article className="card"><strong>02</strong><h3>AI đối chiếu</h3><p>Phân tích nội dung, ngày tháng, tên gọi, số liệu và căn cứ.</p></article>
        <article className="card"><strong>03</strong><h3>Con người xác nhận</h3><p>Người vận hành xem bằng chứng trước khi sử dụng kết quả.</p></article>
      </section>

      <footer className="notice">
        Kết quả AI chỉ hỗ trợ kiểm tra và ra quyết định; không thay thế giám định chuyên môn hoặc kết luận của cơ quan có thẩm quyền.
      </footer>
    </main>
  );
}
