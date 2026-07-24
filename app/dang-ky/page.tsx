import Link from 'next/link';
import { signUp } from './actions';

const errorMessages: Record<string, string> = {
  missing: 'Anh/chị vui lòng nhập đầy đủ email và hai lần mật khẩu.',
  weak: 'Mật khẩu cần có ít nhất 8 ký tự.',
  mismatch: 'Hai lần nhập mật khẩu chưa trùng nhau.',
  exists: 'Email này đã có tài khoản. Anh/chị hãy quay lại đăng nhập.',
  failed: 'Chưa thể tạo tài khoản. Vui lòng thử lại hoặc liên hệ quản trị viên.',
};

export default function SignUpPage({
  searchParams,
}: {
  searchParams?: { error?: string; success?: string };
}) {
  const error = searchParams?.error ? errorMessages[searchParams.error] : null;
  const success = searchParams?.success === 'confirm';

  return (
    <main className="shell narrow">
      <header className="topbar">
        <Link className="brandLockup" href="/">
          <div className="brandMark" aria-hidden="true">H</div>
          <div>
            <div className="brand">HTL HỒ SƠ CHUẨN</div>
            <div className="tagline">Tạo tài khoản để bắt đầu thực chứng toàn hệ thống</div>
          </div>
        </Link>
        <Link className="primary secondary" href="/#dang-nhap">Đã có tài khoản</Link>
      </header>

      <section className="hero" style={{ marginTop: 48, maxWidth: 720 }}>
        <div className="eyebrow">KHU VỰC THÀNH VIÊN</div>
        <h1 style={{ fontSize: 'clamp(38px, 6vw, 60px)' }}>Tạo tài khoản HTL</h1>
        <p>Đăng ký bằng email để truy cập hồ sơ, tải tài liệu và kiểm tra toàn bộ luồng vận hành của HTL.</p>
      </section>

      <section className="loginCard" id="dang-ky">
        <div className="loginStatus"><span aria-hidden="true" /> ĐĂNG KÝ BẢO MẬT</div>
        <div className="eyebrow">TÀI KHOẢN MỚI</div>
        <h2>Đăng ký HTL</h2>
        <p>Dùng email thật để nhận thư xác nhận tài khoản nếu hệ thống yêu cầu.</p>

        {error && <div className="error" role="alert">{error}</div>}
        {success && (
          <div className="notice" role="status">
            Tài khoản đã được tạo. Anh/chị hãy mở email xác nhận, sau đó quay lại đăng nhập HTL.
          </div>
        )}

        {!success && (
          <form action={signUp} className="loginForm">
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" placeholder="ten@doanhnghiep.vn" autoComplete="email" inputMode="email" required />
            </label>
            <label className="field">
              <span>Mật khẩu</span>
              <input name="password" type="password" placeholder="Tối thiểu 8 ký tự" autoComplete="new-password" minLength={8} required />
            </label>
            <label className="field">
              <span>Nhập lại mật khẩu</span>
              <input name="confirmPassword" type="password" placeholder="Nhập lại mật khẩu" autoComplete="new-password" minLength={8} required />
            </label>
            <button className="primary button" type="submit">Tạo tài khoản</button>
          </form>
        )}

        <div className="loginTrust">
          Mật khẩu HTL nên là mật khẩu riêng, không dùng chung với Gmail, GitHub hoặc Vercel.
        </div>
      </section>
    </main>
  );
}
