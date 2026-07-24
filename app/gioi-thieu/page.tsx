import Link from 'next/link';

const benefits = [
  {
    number: '01',
    title: 'Phát hiện điểm sai trước khi công việc bị dừng',
    text: 'HTL đọc và soi chiếu hồ sơ để chỉ ra chỗ thiếu, sai, hết hạn hoặc chưa thống nhất giữa các tài liệu.',
  },
  {
    number: '02',
    title: 'Giải thích bằng chứng thay vì chỉ đưa cảnh báo',
    text: 'Mỗi kết luận đều hướng người dùng về đúng tài liệu, đúng chi tiết và lý do cần xử lý.',
  },
  {
    number: '03',
    title: 'Đưa ra việc cần làm tiếp theo',
    text: 'Người dùng biết nên bổ sung gì, kiểm tra với ai và điều kiện nào cần đạt trước khi tiếp tục công việc.',
  },
];

const audiences = [
  'Nhân viên đang xử lý hồ sơ, chứng từ và công việc hằng ngày',
  'Doanh nghiệp muốn phát hiện sai sót sớm và giảm thời gian hỏi đáp nội bộ',
  'Người làm kế toán, xuất nhập khẩu, pháp lý, mua hàng, vận hành hoặc kiểm soát chất lượng',
  'Cá nhân cần kiểm tra một bộ tài liệu trước khi nộp, gửi hoặc ra quyết định',
];

const capabilities = [
  ['Kiểm tra hồ sơ', 'Nhận diện tài liệu, phát hiện thiếu sót và đưa ra kết luận điều hành.'],
  ['Tìm kiếm nâng cao', 'Tìm hồ sơ, tài liệu và công việc từ một cửa.'],
  ['Nhật ký hoạt động', 'Biết điều gì đã thay đổi, thay đổi khi nào và liên quan hồ sơ nào.'],
  ['Kiểm soát phiên bản', 'Phân biệt bản mới nhất với bản cũ để tránh dùng nhầm tài liệu.'],
  ['Trung tâm công việc', 'Theo dõi việc đang chờ, đang xử lý và cần ưu tiên.'],
  ['Thông báo vận hành', 'Nhắc các hồ sơ thiếu, hết hạn hoặc có nguy cơ đình trệ.'],
];

export default function CommercialLandingPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brandLockup">
          <div className="brandMark" aria-hidden="true">H</div>
          <div>
            <Link className="brand" href="/">HTL HỒ SƠ CHUẨN</Link>
            <div className="tagline">Nền tảng kiểm tra hồ sơ phục vụ lợi ích chung</div>
          </div>
        </div>
        <div className="actions">
          <Link className="primary secondary" href="/#dang-nhap">Đăng nhập</Link>
          <Link className="primary" href="/kiem-tra">Bắt đầu kiểm tra</Link>
        </div>
      </header>

      <section className="hero heroLayout">
        <div className="heroContent">
          <div className="eyebrow">AI HỖ TRỢ KIỂM TRA VÀ XỬ LÝ HỒ SƠ</div>
          <h1>Một nơi để bất kỳ người dùng nào cũng có thể đưa hồ sơ vào kiểm tra và biết việc cần làm tiếp theo.</h1>
          <p>
            HTL Hồ Sơ Chuẩn không giới hạn cho riêng một doanh nghiệp. Nền tảng được xây dựng để người có nhu cầu đều có thể đăng nhập, kiểm tra tài liệu, phát hiện sai lệch và sử dụng kết quả cho công việc của mình.
          </p>
          <div className="heroActions">
            <Link className="primary" href="/kiem-tra">Kiểm tra hồ sơ ngay <span aria-hidden="true">→</span></Link>
            <Link className="primary secondary" href="/#dang-nhap">Đăng nhập hệ thống</Link>
          </div>
          <div className="trustRow">
            <span>✓ Dùng chung cho mọi người</span>
            <span>✓ Kết luận có bằng chứng</span>
            <span>✓ Chỉ rõ bước xử lý</span>
          </div>
        </div>

        <aside className="loginCard">
          <div className="loginStatus"><span aria-hidden="true" /> GIÁ TRỊ CỐT LÕI</div>
          <div className="eyebrow">HTL KHÔNG CHỈ LƯU TÀI LIỆU</div>
          <h2>HTL giúp người dùng không bị mắc lại ở cùng một lỗi nhỏ.</h2>
          <p>Hệ thống tập trung vào ba câu hỏi quan trọng nhất:</p>
          <ul>
            <li>Sai hoặc thiếu ở đâu?</li>
            <li>Vì sao cần xử lý?</li>
            <li>Phải làm gì để tiếp tục?</li>
          </ul>
        </aside>
      </section>

      <section className="capabilityStrip" aria-label="Giá trị nền tảng">
        <div><strong>01</strong><span>Đăng nhập và sử dụng</span></div>
        <div><strong>02</strong><span>Đưa hồ sơ vào kiểm tra</span></div>
        <div><strong>03</strong><span>Nhận kết luận có căn cứ</span></div>
        <div><strong>04</strong><span>Thực hiện việc cần làm tiếp</span></div>
      </section>

      <section className="grid">
        {benefits.map((item) => (
          <article className="card" key={item.number}>
            <strong>{item.number}</strong>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="eyebrow">AI CÓ THỂ SỬ DỤNG?</div>
        <h2>Không giới hạn cho HTL hay một nhóm nội bộ</h2>
        <div className="twoCols">
          <div>
            <h3>Dành cho người trực tiếp làm việc</h3>
            <ul>
              {audiences.slice(0, 2).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div>
            <h3>Dành cho nhiều lĩnh vực nghiệp vụ</h3>
            <ul>
              {audiences.slice(2).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
        <div className="notice">
          Mỗi người dùng đăng nhập để làm việc trên hồ sơ của mình. Mục tiêu của nền tảng là tạo lợi ích chung bằng cách giúp mọi người phát hiện lỗi sớm và xử lý đúng hơn.
        </div>
      </section>

      <section className="workflowSection">
        <div className="sectionHeading">
          <div>
            <div className="eyebrow">NĂNG LỰC ĐÃ CÓ</div>
            <h2>Một hệ thống xuyên suốt từ kiểm tra đến truy vết</h2>
          </div>
          <p>Người dùng không chỉ nhận một câu trả lời AI, mà có không gian để tiếp tục quản lý hồ sơ, công việc và các phiên bản tài liệu liên quan.</p>
        </div>
        <div className="workflowGrid">
          {capabilities.map(([title, text], index) => (
            <article className="workflowCard" key={title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div className="workflowIcon" aria-hidden="true">{index < 2 ? '✦' : index < 4 ? '⇄' : '✓'}</div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="assurancePanel">
        <div>
          <div className="eyebrow lightEyebrow">CAM KẾT SẢN PHẨM</div>
          <h2>Không nói chắc khi chưa đủ căn cứ. Không để người dùng tự đoán bước tiếp theo.</h2>
        </div>
        <div className="assuranceList">
          <div><b>01</b><span>Nói rõ dữ liệu nào đã được sử dụng.</span></div>
          <div><b>02</b><span>Phân biệt kết luận, cảnh báo và nội dung cần xác minh thêm.</span></div>
          <div><b>03</b><span>Ưu tiên hướng xử lý thực tế, dễ hiểu và có thể kiểm tra lại.</span></div>
        </div>
      </section>

      <section className="finalCta">
        <div>
          <div className="eyebrow">BẮT ĐẦU TỪ MỘT HỒ SƠ THẬT</div>
          <h2>Đăng nhập, đưa tài liệu vào và để HTL chỉ ra nơi cần xử lý trước.</h2>
        </div>
        <div className="finalCtaActions">
          <Link className="primary" href="/kiem-tra">Bắt đầu kiểm tra <span aria-hidden="true">→</span></Link>
          <Link className="textLink" href="/#dang-nhap">Đăng nhập</Link>
        </div>
      </section>

      <footer className="siteFooter">
        <div className="footerBrand">
          <div className="brandMark" aria-hidden="true">H</div>
          <div>
            <strong>HTL HỒ SƠ CHUẨN</strong>
            <p>Nền tảng AI giúp mọi người phát hiện lỗi hồ sơ sớm và biết cách xử lý tiếp theo.</p>
          </div>
        </div>
        <div className="footerBottom">
          <span>© 2026 HTL Hồ Sơ Chuẩn</span>
          <span>Dùng chung — minh bạch — có bằng chứng — có hướng xử lý.</span>
        </div>
      </footer>
    </main>
  );
}
