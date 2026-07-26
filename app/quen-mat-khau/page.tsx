'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function ForgotPasswordPage() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  )

  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [message, setMessage] = useState('Nhập email đã đăng ký để nhận liên kết tạo mật khẩu mới.')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      setMessage('Anh vui lòng nhập địa chỉ email đã đăng ký.')
      return
    }

    setSubmitting(true)
    setMessage('HTL đang gửi liên kết đặt lại mật khẩu...')

    const redirectTo = `${window.location.origin}/dat-lai-mat-khau`
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo })

    setSubmitting(false)

    if (error) {
      setMessage('Chưa gửi được email. Anh kiểm tra lại địa chỉ email hoặc thử lại sau ít phút.')
      return
    }

    setSent(true)
    setMessage('Đã gửi liên kết. Anh mở Gmail, kiểm tra cả Hộp thư đến và Thư rác, rồi bấm liên kết trong email của HTL/Supabase.')
  }

  return (
    <main className="recoveryShell">
      <section className="recoveryCard">
        <div className="brandRow">
          <div className="brandMark" aria-hidden="true">H</div>
          <div>
            <strong>HTL HỒ SƠ CHUẨN</strong>
            <span>Khôi phục quyền truy cập an toàn</span>
          </div>
        </div>

        <div className="secureBadge"><i aria-hidden="true" /> KẾT NỐI BẢO MẬT</div>
        <h1>Quên mật khẩu</h1>
        <p className={sent ? 'message success' : 'message'} role="status" aria-live="polite">{message}</p>

        {!sent ? (
          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email đăng ký</label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="ten@doanhnghiep.vn"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={submitting}
              required
              autoFocus
            />
            <button type="submit" disabled={submitting}>
              {submitting ? <><span className="spinner" aria-hidden="true" /> Đang gửi liên kết...</> : <>Gửi liên kết đặt lại mật khẩu <span aria-hidden="true">→</span></>}
            </button>
          </form>
        ) : (
          <div className="sentActions">
            <a href="https://mail.google.com" target="_blank" rel="noreferrer">Mở Gmail</a>
            <button type="button" onClick={() => { setSent(false); setMessage('Nhập email đã đăng ký để nhận liên kết tạo mật khẩu mới.') }}>Gửi lại bằng email khác</button>
          </div>
        )}

        <Link className="backLink" href="/#dang-nhap">← Quay lại đăng nhập</Link>
        <div className="securityNote">HTL không bao giờ yêu cầu anh gửi mật khẩu qua email hoặc tin nhắn.</div>
      </section>

      <style jsx>{`
        .recoveryShell { min-height: 100vh; display: grid; place-items: center; padding: 28px; background: radial-gradient(circle at 12% 0%, rgba(36,90,61,.10), transparent 32%), radial-gradient(circle at 90% 20%, rgba(48,74,115,.10), transparent 35%), #f4f6f8; }
        .recoveryCard { width: 100%; max-width: 500px; padding: 34px; border: 1px solid #dfe5eb; border-radius: 26px; background: rgba(255,255,255,.96); box-shadow: 0 28px 80px rgba(23,32,51,.14); }
        .brandRow { display: flex; align-items: center; gap: 12px; margin-bottom: 26px; }
        .brandMark { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 13px; color: #fff; background: linear-gradient(145deg,#24324a,#0f1728); font-weight: 900; }
        .brandRow strong, .brandRow span { display: block; }
        .brandRow strong { color: #172033; letter-spacing: .03em; }
        .brandRow span { margin-top: 3px; color: #758093; font-size: 12px; }
        .secureBadge { display: inline-flex; align-items: center; gap: 8px; padding: 7px 10px; border: 1px solid #d4e9da; border-radius: 999px; color: #315844; background: #edf6f0; font-size: 10px; font-weight: 900; letter-spacing: .12em; }
        .secureBadge i { width: 8px; height: 8px; border-radius: 50%; background: #2e8b57; box-shadow: 0 0 0 5px rgba(46,139,87,.10); }
        h1 { margin: 14px 0 10px; color: #172033; font-size: 36px; letter-spacing: -.035em; }
        .message { min-height: 52px; margin: 0 0 24px; color: #687386; line-height: 1.6; }
        .message.success { padding: 14px 16px; border: 1px solid #cfe4d5; border-radius: 13px; color: #315844; background: #f0f8f2; }
        form { display: grid; gap: 10px; }
        label { color: #172033; font-size: 14px; font-weight: 800; }
        input { width: 100%; box-sizing: border-box; padding: 14px 15px; border: 1px solid #cfd6df; border-radius: 13px; color: #172033; background: #fbfcfd; font: inherit; outline: none; }
        input:focus { border-color: #245a3d; background: #fff; box-shadow: 0 0 0 4px rgba(36,90,61,.10); }
        form button, .sentActions a { min-height: 52px; display: inline-flex; align-items: center; justify-content: center; gap: 10px; margin-top: 8px; border: 0; border-radius: 13px; padding: 14px 18px; color: #fff; background: linear-gradient(180deg,#1d2940,#111a2c); font: inherit; font-weight: 800; text-decoration: none; cursor: pointer; }
        form button:disabled { opacity: .66; cursor: wait; }
        .spinner { width: 17px; height: 17px; border: 2px solid rgba(255,255,255,.35); border-top-color: #fff; border-radius: 50%; animation: spin .8s linear infinite; }
        .sentActions { display: grid; gap: 10px; }
        .sentActions button { min-height: 44px; border: 1px solid #d8e0e7; border-radius: 12px; color: #314056; background: #fff; font: inherit; font-weight: 800; cursor: pointer; }
        .backLink { display: inline-block; margin-top: 24px; color: #245a3d; font-size: 14px; font-weight: 800; text-decoration: none; }
        .securityNote { margin-top: 22px; padding-top: 16px; border-top: 1px solid #e6ebef; color: #7a8594; font-size: 12px; line-height: 1.5; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 560px) { .recoveryShell { padding: 16px; } .recoveryCard { padding: 26px 22px; border-radius: 22px; } h1 { font-size: 31px; } }
      `}</style>
    </main>
  )
}
