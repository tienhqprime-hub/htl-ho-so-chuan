import Link from 'next/link';
import RecoveryRedirect from './recovery-redirect';
import { login } from './dang-nhap/actions';

const principles = [
  ['01', 'Chỉ dựa trên hồ sơ được cung cấp', 'Mỗi nhận định phải quay lại được tài liệu, vị trí và bằng chứng cụ thể.'],
  ['02', 'Nói rõ điều biết và chưa biết', 'Khi chưa đủ căn cứ, HTL nói thẳng thay vì suy đoán hoặc khẳng định quá mức.'],
  ['03', 'Con người quyết định cuối cùng', 'AI hỗ trợ đọc, đối chiếu và cảnh báo; người sử dụng vẫn là người xem xét và quyết định.'],
];

export default function HomePage() {
  return (
    <main className="shell">
      <RecoveryRedirect />
      <header className="topbar">
        <div>
          <div className="brand">HTL HỒ SƠ CHUẨN</div>
          <div className="tagline">AI hỗ trợ kiểm tra và quản lý hồ sơ cần làm rõ</div>
        </div>
        <span className="pilot">BẢN PILOT</span>
      </header>

      <section className="hero heroLayout">
        <div className="heroContent">
          <div className="eyebrow">TRỢ LÝ AI CHUYÊN SÂU VỀ HỒ SƠ</div>
          <h1>Đọc kỹ hồ sơ. Chỉ rõ bằng chứng. Nói thật giới hạn.</h1>
          <p>
            HTL giúp anh/chị quản lý hồ sơ, đối chiếu thông tin, phát hiện điểm chưa thống nhất và xác định việc cần làm tiếp theo mà không đưa ra kết luận vượt quá bằng chứng.
          </p>
          <div className="heroActions">
            <Link className="primary" href="/ho-so">Quản lý hồ sơ</Link>
            <Link className="primary secondary" href="/kiem-tra">Kiểm tra tài liệu</Link>
            <a className="primary secondary" href="#dang-nhap">Đăng nhập</a>
          </div>
        </div>

        <aside className="loginCard" id="dang-nhap">
          <div className="eyebrow">KHU VỰC THÀNH VIÊN</div>
          <h2>Đăng nhập HTL</h2>
          <p>Truy cập hồ sơ và tiếp tục công việc đang thực hiện.</p>
          <form action={login} className="loginForm">
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" placeholder="ten@doanhnghiep.vn" autoComplete="email" required />
            </label>
            <label className="field">
              <span>Mật khẩu</span>
              <input name="password" type="password" placeholder="Nhập mật khẩu" autoComplete="current-password" required />
            </label>
            <button className="primary button" type="submit">Đăng nhập</button>
          </form>
        </aside>
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
        <h2>Quản lý, đọc, đối chiếu và giải thích hồ sơ theo cách dễ hiểu</h2>
        <div className="twoCols">
          <div>
            <h3>HTL có thể</h3>
            <ul>
              <li>Tạo và theo dõi hồ sơ theo từng doanh nghiệp hoặc khách hàng.</li>
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
