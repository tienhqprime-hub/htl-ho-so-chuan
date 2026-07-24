'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function ResetPasswordPage() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            detectSessionInUrl: true,
            persistSession: true,
          },
        },
      ),
    [],
  )

  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('Đang xác thực liên kết đặt lại mật khẩu...')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true

    async function prepareSession() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (error) {
          if (active) setMessage('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.')
          return
        }
      }

      const { data } = await supabase.auth.getSession()
      if (!active) return

      if (!data.session) {
        setMessage('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.')
        return
      }

      setReady(true)
      setMessage('Hãy nhập mật khẩu mới cho tài khoản HTL của anh.')
    }

    prepareSession()

    return () => {
      active = false
    }
  }, [supabase])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (password.length < 8) {
      setMessage('Mật khẩu mới cần có ít nhất 8 ký tự.')
      return
    }

    if (password !== confirmPassword) {
      setMessage('Hai ô mật khẩu chưa giống nhau.')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSubmitting(false)

    if (error) {
      setMessage(`Chưa đổi được mật khẩu: ${error.message}`)
      return
    }

    setMessage('Đổi mật khẩu thành công. Đang chuyển anh về trang đăng nhập...')
    window.setTimeout(() => {
      window.location.href = '/?passwordReset=1#dang-nhap'
    }, 1200)
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f4f7fb' }}>
      <section style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 20px 60px rgba(15, 23, 42, 0.12)' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: 1.5, color: '#18794e' }}>HTL HỒ SƠ CHUẨN</p>
        <h1 style={{ margin: '10px 0 8px', fontSize: 32, color: '#152238' }}>Đặt lại mật khẩu</h1>
        <p style={{ margin: '0 0 24px', lineHeight: 1.6, color: '#5f6b7a' }}>{message}</p>

        {ready && (
          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, color: '#152238' }} htmlFor="password">
              Mật khẩu mới
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', border: '1px solid #cbd5e1', borderRadius: 12, fontSize: 16, marginBottom: 18 }}
            />

            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, color: '#152238' }} htmlFor="confirm-password">
              Nhập lại mật khẩu mới
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', border: '1px solid #cbd5e1', borderRadius: 12, fontSize: 16, marginBottom: 22 }}
            />

            <button
              type="submit"
              disabled={submitting}
              style={{ width: '100%', border: 0, borderRadius: 12, padding: '15px 18px', background: '#152238', color: '#fff', fontWeight: 800, fontSize: 16, cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Đang đổi mật khẩu...' : 'Xác nhận mật khẩu mới'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}
