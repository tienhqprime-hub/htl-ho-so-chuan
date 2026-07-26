'use client';

import { useEffect, useState } from 'react';

const authMessages: Record<string, { title: string; detail: string }> = {
  missing: {
    title: 'Chưa đủ thông tin đăng nhập',
    detail: 'Anh/chị vui lòng nhập đầy đủ email và mật khẩu.',
  },
  invalid: {
    title: 'Email hoặc mật khẩu chưa đúng',
    detail: 'Hãy bấm “Hiện” để kiểm tra mật khẩu, hoặc chọn “Quên mật khẩu?” để tạo mật khẩu mới.',
  },
  unconfirmed: {
    title: 'Email chưa được xác nhận',
    detail: 'Anh/chị vui lòng mở email xác nhận tài khoản rồi đăng nhập lại.',
  },
};

export default function RecoveryRedirect() {
  const [message, setMessage] = useState<{ title: string; detail: string } | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.slice(1));
      if (hashParams.get('type') === 'recovery' && hashParams.get('access_token')) {
        window.location.replace(`/dat-lai-mat-khau${hash}`);
        return;
      }
    }

    const searchParams = new URLSearchParams(window.location.search);
    const authError = searchParams.get('authError');
    if (authError && authMessages[authError]) {
      setMessage(authMessages[authError]);
      window.setTimeout(() => {
        document.getElementById('dang-nhap')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, []);

  if (!message) return null;

  return (
    <div className="authFeedback" role="alert" aria-live="assertive">
      <div className="authIcon" aria-hidden="true">!</div>
      <div>
        <strong>{message.title}</strong>
        <p>{message.detail}</p>
      </div>
      <button type="button" onClick={() => setMessage(null)} aria-label="Đóng thông báo">×</button>

      <style jsx>{`
        .authFeedback { position: fixed; z-index: 100; top: 20px; left: 50%; transform: translateX(-50%); width: min(92vw, 560px); display: grid; grid-template-columns: auto 1fr auto; align-items: start; gap: 12px; padding: 16px 18px; border: 1px solid #f0c9c5; border-radius: 16px; color: #7a271a; background: rgba(255,248,247,.98); box-shadow: 0 18px 55px rgba(74,27,20,.18); backdrop-filter: blur(14px); animation: feedbackIn .25s ease both; }
        .authIcon { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 50%; color: white; background: #b42318; font-weight: 900; }
        strong { display: block; margin: 1px 0 4px; font-size: 14px; }
        p { margin: 0; color: #8a3b30; font-size: 13px; line-height: 1.5; }
        button { border: 0; padding: 0 2px; color: #8a3b30; background: transparent; font-size: 24px; line-height: 1; cursor: pointer; }
        button:focus-visible { outline: 3px solid rgba(180,35,24,.2); outline-offset: 3px; border-radius: 6px; }
        @keyframes feedbackIn { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }
      `}</style>
    </div>
  );
}
