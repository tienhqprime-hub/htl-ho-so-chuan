import Link from 'next/link';
import { signup } from '../dang-nhap/actions';

type PageProps = {
  searchParams?: { error?: string; success?: string };
};

const errors: Record<string, string> = {
  missing: 'Anh/chị vui lòng nhập đầy đủ email và hai ô mật khẩu.',
  weak: 'Mật khẩu cần có ít nhất 8 ký tự.',
  mismatch: 'Hai mật khẩu chưa trùng khớp.',
  failed: 'Chưa thể tạo tài khoản. Email có thể đã được sử dụng hoặc hệ thống đang bận.',
};

export default function RegisterPage({ searchParams }: PageProps) {
  const errorMessage = searchParams?.error ? errors[searchParams.error] : '';
  const checkEmail = searchParams?.success === 'check-email';

  return (
    <main className="shell narrow">
      <header className="topbar">
        <Link href="/" className="brand">HTL HỒ SƠ CHUẨN</Link>
        <span className="pilot">ĐĂNG KÝ THÀNH VIÊN</span>
      </header>

      <section className="panel" style={{ maxWidth: 620, margin: '42px auto', padding: 32 }}>
        <div className="eyebrow">TÀI KHOẢN RIÊNG – HỒ SƠ RIÊNG</div>
        <h1 style={{ marginBottom: 12 }}>Đăng ký sử dụng HTL</h1>
        <p className="muted">
          Tạo tài khoản miễn phí để lưu hồ sơ, lịch sử xử lý và kết quả phân tích trong khu vực riêng của anh/chị.
        </p>

        {checkEmail ? (
          <div className="notice" style={{ marginTop: 24 }}>
            <strong>Đã tiếp nhận đăng ký.</strong><br />
            Anh/chị hãy mở email và bấm liên kết xác nhận. Sau đó hệ thống sẽ đưa anh/chị vào khu vực hồ sơ.
          </div>
        ) : (
          <form action={signup} className="loginForm" style={{ marginTop: 26 }}>
            <label className="field" htmlFor="register-email">
              <span>Email</span>
              <input id="register-email" name="email" type="email" placeholder="ten@doanhnghiep.vn" autoComplete="email" required />
            </label>

            <label className="field" htmlFor="register-password">
              <span>Mật khẩu</span>
              <input id="register-password" name="password" type="password" minLength={8} placeholder="Tối thiểu 8 ký tự" autoComplete="new-password" required />
            </label>

            <label className="field" htmlFor="register-confirm-password">
              <span>Nhập lại mật khẩu</span>
              <input id="register-confirm-password" name="confirmPassword" type="password" minLength={8} placeholder="Nhập lại mật khẩu" autoComplete="new-password" required />
            </label>

            {errorMessage && (
              <div className="notice" style={{ background: '#fff4f2', color: '#9f241b' }} role="alert">
                {errorMessage}
              </div>
            )}

            <button className="primary button loginSubmit" type="submit">
              Đăng ký miễn phí <span className="buttonArrow" aria-hidden="true">→</span>
            </button>
          </form>
        )}

        <div className="loginTrust" style={{ marginTop: 22 }}>
          Đã có tài khoản? <Link href="/#dang-nhap"><strong>Quay về đăng nhập</strong></Link>
        </div>
      </section>
    </main>
  );
}
