import Link from 'next/link';

const principles = [
  ['01', 'Chỉ dựa trên hồ sơ được cung cấp', 'Mỗi nhận định phải quay lại được tài liệu, vị trí và bằng chứng cụ thể.'],
  ['02', 'Nói rõ điều biết và chưa biết', 'Khi chưa đủ căn cứ, HTL nói thẳng thay vì suy đoán hoặc khẳng định quá mức.'],
  ['03', 'Con người quyết định cuối cùng', 'AI hỗ trợ đọc, đối chiếu và cảnh báo; người sử dụng vẫn là người xem xét và quyết định.'],
];

export default function HomePage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="brand">HTL HỒ SƠ CHUẨN</div>
          <div className="tagline">AI hỗ trợ kiểm tra hồ sơ cần làm rõ</div>
        </div>
        <span className="pilot">BẢN PILOT</span>
      </header>

      <section className="hero">
        <div className="eyebrow">TRỢ LÝ AI CHUYÊN SÂU VỀ HỒ SƠ</div>
        <h1>Đọc kỹ hồ sơ. Chỉ rõ bằng chứng. Nói thật giới hạn.</h1>
        <p>
          HTL giúp anh/chị đối chiếu thông tin, phát hiện điểm chưa thống nhất và xác định việc cần làm tiếp theo mà không đưa ra kết luận vượt quá bằng chứng.
        </p>
        <Link className="primary" href="/kiem-tra">Bắt đầu kiểm tra hồ sơ</Link>
      </section>

      <section className="grid">
        {principles.map(([number, title, text]) => (
          <article className="card" key={number}>
            <strong>{number}</strong>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="eyebrow">HTL SẼ GIÚP ANH/CHỊ</div>
        <h2>Đọc, đối chiếu và giải thích hồ sơ theo cách dễ hiểu</h2>
        <div className="twoCols">
          <div>
            <h3>HTL có thể</h3>
            <ul>
              <li>Đọc nội dung, bảng biểu, dấu và chữ ký nhìn thấy được.</li>
              <li>Đối chiếu tên, số, ngày tháng và số liệu giữa nhiều tài liệu.</li>
              <li>Chỉ ra điểm phù hợp, mâu thuẫn, còn thiếu hoặc cần xác minh.</li>
            </ul>
          </div>
          <div>
            <h3>HTL không thay thế</h3>
            <ul>
              <li>Giám định chuyên môn, công chứng hoặc cơ quan cấp phát.</li>
              <li>Tư vấn pháp lý chính thức hay quyết định của con người.</li>
              <li>Kết luận thật, giả khi chưa có đủ bằng chứng.</li>
            </ul>
          </div>
        </div>
        <div className="notice">
          Báo cáo của HTL là công cụ hỗ trợ ra quyết định. Mỗi kết luận đều cần được đọc cùng bằng chứng và giới hạn đi kèm.
        </div>
      </section>
    </main>
  );
}
