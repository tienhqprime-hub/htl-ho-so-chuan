import Link from 'next/link';
import RecoveryRedirect from './recovery-redirect';
import LoginSubmitButton from './login-submit-button';
import { login } from './dang-nhap/actions';

const commonProblems = [
  ['01', 'Một chi tiết không rõ', 'Chữ mờ, số liệu khó đọc, thiếu dấu, thiếu chữ ký hoặc không xác định được vị trí cần kiểm tra.'],
  ['02', 'Các tài liệu không khớp', 'Tên, số, ngày, số lượng, giá trị hoặc nội dung giữa hợp đồng, hóa đơn và chứng từ chưa thống nhất.'],
  ['03', 'Không biết xử lý từ đâu', 'Nhân viên đang mắc việc nhưng chưa xác định được lỗi nằm ở đâu, cần hỏi ai và phải làm bước nào trước.'],
];

const workflow = [
  ['01', 'Tiếp nhận việc đang vướng', 'Tải tài liệu, ảnh, hồ sơ hoặc mô tả ngắn tình huống đang làm công việc bị đình trệ.'],
  ['02', 'AI quan sát và phân loại', 'Nhận diện tài liệu là gì, nội dung nào đọc được, nội dung nào chưa rõ và bản chất vấn đề cần giải quyết.'],
  ['03', 'Soi chiếu và chỉ ra sai lệch', 'Đối chiếu các nguồn, tìm điểm đúng, sai, thiếu, thừa, chưa thống nhất và dẫn lại bằng chứng cụ thể.'],
  ['04', 'Đưa ra hướng xử lý', 'Sắp xếp việc cần làm theo thứ tự ưu tiên và nêu điều kiện để nhân viên có thể tiếp tục công việc.'],
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
            <div className="tagline">AI giúp phát hiện sớm lỗi nhỏ trước khi thành rủi ro lớn</div>
          </div>
        </div>
        <div className="topbarMeta">
          <span className="systemOnline"><i aria-hidden="true" /> HỆ THỐNG SẴN SÀNG</span>
          <span className="pilot">BẢN XUẤT BẢN</span>
        </div>
      </header>

      <section className="hero heroLayout">
        <div className="heroContent">
          <div className="eyebrow">TRỢ LÝ AI GIẢI QUYẾT VƯỚNG MẮC HỒ SƠ TRONG DOANH NGHIỆP</div>
          <h1>Đang mắc việc ở đâu, đưa vào HTL để tìm đúng chỗ cần xử lý.</h1>
          <p>
            Một lỗi rất nhỏ trong hồ sơ có thể làm chậm nhập hàng, dừng sản xuất hoặc phát sinh chi phí lớn. HTL giúp nhân viên đọc, phân loại, soi chiếu và tìm hướng xử lý ngay để công việc không bị đình trệ.
          </p>
          <div className="heroActions">
            <Link className="primary" href="/kiem-tra">Giải quyết việc đang vướng <span aria-hidden="true">→</span></Link>
            <Link className="primary secondary" href="/ho-so">Mở khu vực hồ sơ</Link>
          </div>
          <div className="trustRow" aria-label="Giá trị HTL">
            <span>✓ Chỉ rõ lỗi ở đâu</span>
            <span>✓ Dẫn lại bằng chứng</span>
            <span>✓ Hướng dẫn việc cần làm</span>
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
        <div><strong>01</strong><span>Tiếp nhận mọi vướng mắc</span></div>
        <div><strong>02</strong><span>Đọc và phân loại bằng AI</span></div>
        <div><strong>03</strong><span>Soi chiếu nhiều tài liệu</span></div>
        <div><strong>04</strong><span>Chỉ rõ hướng xử lý</span></div>
      </section>

      <section className="grid">
        {commonProblems.map(([number, title, text]) => (
          <article className="card" key={number}>
            <strong>{number}</strong>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="eyebrow">MỤC TIÊU CỦA HTL</div>
        <h2>Giải quyết 20% lỗi thường gặp đang làm ảnh hưởng đến 80% công việc hằng ngày</h2>
        <div className="twoCols">
          <div>
            <h3>HTL giúp nhân viên</h3>
            <ul>
              <li>Đưa ngay tài liệu hoặc tình huống đang làm mình mắc việc vào hệ thống.</li>
              <li>Nhìn thấy lỗi, sai lệch hoặc thông tin còn thiếu tại đúng vị trí.</li>
              <li>Biết vì sao cần xử lý và căn cứ nào đang được sử dụng.</li>
              <li>Có danh sách việc cần làm theo đúng thứ tự để tiếp tục công việc.</li>
            </ul>
          </div>
          <div>
            <h3>HTL giúp doanh nghiệp</h3>
            <ul>
              <li>Giảm việc nhân viên phải hỏi lãnh đạo từng chi tiết nhỏ.</li>
              <li>Phát hiện sai sót sớm trước khi gây đình trệ hoặc tổn thất lớn.</li>
              <li>Lưu lại bằng chứng, kết quả kiểm tra và quá trình xử lý.</li>
              <li>Nâng cao ý thức làm đúng ngay từ những chi tiết nhỏ nhất.</li>
            </ul>
          </div>
        </div>
        <div className="notice">
          HTL hỗ trợ quan sát, đối chiếu và đề xuất hướng xử lý dựa trên tài liệu được cung cấp. Những nội dung chưa đủ căn cứ sẽ được nói rõ để người dùng xác minh thêm.
        </div>
      </section>

      <section className="workflowSection">
        <div className="sectionHeading">
          <div>
            <div className="eyebrow">CÁCH HTL LÀM VIỆC</div>
            <h2>Từ một vướng mắc nhỏ đến một hướng xử lý có thể thực hiện ngay</h2>
          </div>
          <p>Người dùng không cần biết tên thủ tục hay phải hỏi đúng chuyên gia. Chỉ cần đưa việc đang vướng và các tài liệu hiện có vào HTL.</p>
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
          <div className="eyebrow lightEyebrow">LINH HỒN CỦA HTL</div>
          <h2>Gỡ một chiếc gai nhỏ trong công việc trước khi nó trở thành một tổn thất lớn.</h2>
        </div>
        <div className="assuranceList">
          <div><b>01</b><span>Hiểu đúng việc người dùng đang mắc.</span></div>
          <div><b>02</b><span>Chỉ rõ sai ở đâu và dựa trên bằng chứng nào.</span></div>
          <div><b>03</b><span>Đưa ra hướng xử lý đơn giản, thiết thực và có thể kiểm tra.</span></div>
        </div>
      </section>

      <section className="finalCta">
        <div>
          <div className="eyebrow">BẮT ĐẦU TỪ VIỆC ĐANG LÀM ANH/CHỊ MẮC HÔM NAY</div>
          <h2>Đưa tài liệu vào. HTL sẽ giúp tìm đúng điểm vướng và việc cần làm tiếp theo.</h2>
        </div>
        <div className="finalCtaActions">
          <Link className="primary" href="/kiem-tra">Bắt đầu kiểm tra <span aria-hidden="true">→</span></Link>
          <Link className="textLink" href="/ho-so">Mở khu vực hồ sơ</Link>
        </div>
      </section>

      <footer className="siteFooter">
        <div className="footerBrand">
          <div className="brandMark" aria-hidden="true">H</div>
          <div>
            <strong>HTL HỒ SƠ CHUẨN</strong>
            <p>AI giúp phát hiện sớm lỗi nhỏ trước khi chúng gây ra rủi ro lớn.</p>
          </div>
        </div>
        <div className="footerColumns">
          <div>
            <b>Sản phẩm</b>
            <Link href="/kiem-tra">Giải quyết việc đang vướng</Link>
            <Link href="/ho-so">Khu vực hồ sơ</Link>
          </div>
          <div>
            <b>Nguyên tắc</b>
            <span>Có bằng chứng</span>
            <span>Nói rõ giới hạn</span>
          </div>
          <div>
            <b>Trạng thái</b>
            <span className="footerStatus"><i aria-hidden="true" /> Hệ thống hoạt động</span>
            <span>Phiên bản 1.0</span>
          </div>
        </div>
        <div className="footerBottom">
          <span>© 2026 HTL Hồ Sơ Chuẩn</span>
          <span>Giúp người dùng bớt một việc khổ — giúp doanh nghiệp bớt một rủi ro.</span>
        </div>
      </footer>
    </main>
  );
}
