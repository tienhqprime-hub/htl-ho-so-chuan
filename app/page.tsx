import Link from 'next/link';
import RecoveryRedirect from './recovery-redirect';
import LoginSubmitButton from './login-submit-button';
import { login } from './dang-nhap/actions';

const principles = [
  ['01', 'Chỉ dựa trên hồ sơ được cung cấp', 'Mỗi nhận định phải quay lại được tài liệu, vị trí và bằng chứng cụ thể.'],
  ['02', 'Nói rõ điều biết và chưa biết', 'Khi chưa đủ căn cứ, HTL nói thẳng thay vì suy đoán hoặc khẳng định quá mức.'],
  ['03', 'Con người quyết định cuối cùng', 'AI hỗ trợ đọc, đối chiếu và cảnh báo; người sử dụng vẫn là người xem xét và quyết định.'],
];

const workflow = [
  ['01', 'Tiếp nhận hồ sơ', 'Tải lên tài liệu và tập hợp hồ sơ theo từng doanh nghiệp hoặc công việc.'],
  ['02', 'AI đọc và trích xuất', 'Nhận diện nội dung, số liệu, ngày tháng, chủ thể và các chi tiết có thể quan sát.'],
  ['03', 'Đối chiếu và cảnh báo', 'So sánh giữa nhiều tài liệu để chỉ ra điểm phù hợp, chưa thống nhất hoặc còn thiếu.'],
  ['04', 'Con người xem xét', 'Người dùng đọc bằng chứng, giới hạn và quyết định bước xử lý tiếp theo.'],
];

export default function HomePage() {
  return (
    <main className="shell">
      <RecoveryRedirect />
      <header className="topbar">
        <div className="brandLockup">
          <div className="brandMark" aria-hidden="true">H</div>
          <div>
            <div className="brand">HTL HỒ SƠ CHUẨN</div>
            <div className="tagline">AI hỗ trợ kiểm tra và quản lý hồ sơ cần làm rõ</div>
          </div>
        </div>
        <div className="topbarMeta">
          <span className="systemOnline"><i aria-hidden="true" /> HỆ THỐNG SẴN SÀNG</span>
          <span className="pilot">BẢN PILOT</span>
        </div>
      </header>

      <section className="hero heroLayout">
        <div className="heroContent">
          <div className="eyebrow">TRỢ LÝ AI CHUYÊN SÂU VỀ HỒ SƠ</div>
          <h1>Đọc kỹ hồ sơ. Chỉ rõ bằng chứng. Nói thật giới hạn.</h1>
          <p>
            HTL giúp anh/chị quản lý hồ sơ, đối chiếu thông tin, phát hiện điểm chưa thống nhất và xác định việc cần làm tiếp theo mà không đưa ra kết luận vượt quá bằng chứng.
          </p>
          <div className="heroActions">
            <Link className="primary" href="/ho-so">Quản lý hồ sơ <span aria-hidden="true">→</span></Link>
            <Link className="primary secondary" href="/kiem-tra">Kiểm tra tài liệu</Link>
          </div>
          <div className="trustRow" aria-label="Các nguyên tắc vận hành">
            <span>✓ Có bằng chứng</span>
            <span>✓ Nêu rõ giới hạn</span>
            <span>✓ Con người quyết định</span>
          </div>
        </div>

        <aside className="loginCard" id="dang-nhap">
          <div className="loginStatus"><span aria-hidden="true" /> KẾT NỐI BẢO MẬT</div>
          <div className="eyebrow">KHU VỰC THÀNH VIÊN</div>
          <h2>Đăng nhập HTL</h2>
          <p>Truy cập hồ sơ và tiếp tục công việc đang thực hiện.</p>
          <form action={login} className="loginForm">
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" placeholder="ten@doanhnghiep.vn" autoComplete="email" inputMode="email" required />
            </label>
            <label className="field">
              <span>Mật khẩu</span>
              <input name="password" type="password" placeholder="Nhập mật khẩu" autoComplete="current-password" required />
            </label>
            <LoginSubmitButton />
          </form>
          <div className="loginTrust">Phiên đăng nhập được bảo vệ và chỉ dùng để truy cập hồ sơ của anh/chị.</div>
        </aside>
      </section>

      <section className="capabilityStrip" aria-label="Năng lực nền tảng">
        <div><strong>01</strong><span>Quản lý hồ sơ tập trung</span></div>
        <div><strong>02</strong><span>Trích xuất dữ liệu bằng AI</span></div>
        <div><strong>03</strong><span>Đối chiếu nhiều tài liệu</span></div>
        <div><strong>04</strong><span>Báo cáo có căn cứ</span></div>
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

      <section className="workflowSection">
        <div className="sectionHeading">
          <div>
            <div className="eyebrow">QUY TRÌNH LÀM VIỆC</div>
            <h2>Từ tài liệu rời rạc đến một hồ sơ có thể kiểm tra</h2>
          </div>
          <p>HTL tổ chức quá trình xử lý thành các bước rõ ràng để người dùng luôn biết hệ thống đang làm gì và cần xem xét điều gì.</p>
        </div>
        <div className="workflowGrid">
          {workflow.map(([number, title, text]) => (
            <article className="workflowCard" key={number}>
              <span>{number}</span>
              <div className="workflowIcon" aria-hidden="true">{number === '01' ? '▣' : number === '02' ? '✦' : number === '03' ? '⇄' : '✓'}</div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="assurancePanel">
        <div>
          <div className="eyebrow lightEyebrow">NGUYÊN TẮC TIN CẬY</div>
          <h2>Không chỉ đưa ra câu trả lời. HTL chỉ rõ vì sao có câu trả lời đó.</h2>
        </div>
        <div className="assuranceList">
          <div><b>01</b><span>Dẫn chiếu tài liệu và vị trí làm căn cứ.</span></div>
          <div><b>02</b><span>Phân biệt dữ kiện, nhận định và điều chưa biết.</span></div>
          <div><b>03</b><span>Giữ quyền quyết định cuối cùng cho con người.</span></div>
        </div>
      </section>

      <section className="finalCta">
        <div>
          <div className="eyebrow">BẮT ĐẦU TỪ MỘT HỒ SƠ THẬT</div>
          <h2>Đưa tài liệu vào một quy trình rõ ràng, có căn cứ và dễ kiểm soát.</h2>
        </div>
        <div className="finalCtaActions">
          <Link className="primary" href="/kiem-tra">Kiểm tra tài liệu <span aria-hidden="true">→</span></Link>
          <Link className="textLink" href="/ho-so">Mở khu vực hồ sơ</Link>
        </div>
      </section>

      <footer className="siteFooter">
        <div className="footerBrand">
          <div className="brandMark" aria-hidden="true">H</div>
          <div>
            <strong>HTL HỒ SƠ CHUẨN</strong>
            <p>AI hỗ trợ đọc, quản lý và đối chiếu hồ sơ dựa trên bằng chứng.</p>
          </div>
        </div>
        <div className="footerColumns">
          <div>
            <b>Sản phẩm</b>
            <Link href="/ho-so">Quản lý hồ sơ</Link>
            <Link href="/kiem-tra">Kiểm tra tài liệu</Link>
          </div>
          <div>
            <b>Nguyên tắc</b>
            <span>Có căn cứ</span>
            <span>Nêu rõ giới hạn</span>
          </div>
          <div>
            <b>Trạng thái</b>
            <span className="footerStatus"><i aria-hidden="true" /> Hệ thống hoạt động</span>
            <span>Bản Pilot 1</span>
          </div>
        </div>
        <div className="footerBottom">
          <span>© 2026 HTL Hồ Sơ Chuẩn</span>
          <span>Công cụ hỗ trợ ra quyết định — không thay thế thẩm định chuyên môn.</span>
        </div>
      </footer>
    </main>
  );
}
