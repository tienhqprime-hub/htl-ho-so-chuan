'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function PasswordField() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="field passwordField">
      <div className="passwordLabelRow">
        <label htmlFor="password">Mật khẩu</label>
        <Link className="forgotPassword" href="/quen-mat-khau">
          Quên mật khẩu?
        </Link>
      </div>

      <div className="passwordInputWrap">
        <input
          id="password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Nhập mật khẩu"
          autoComplete="current-password"
          aria-describedby="password-help"
          required
        />
        <button
          className="passwordToggle"
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={showPassword}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {showPassword ? (
              <>
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                <path d="M9.9 4.2A10.8 10.8 0 0112 4c5.2 0 9 4.8 9 8a8.8 8.8 0 01-2.1 3.7" />
                <path d="M6.6 6.6C4.4 8.1 3 10.3 3 12c0 3.2 3.8 8 9 8 1.4 0 2.7-.3 3.9-.9" />
              </>
            ) : (
              <>
                <path d="M3 12s3.8-8 9-8 9 8 9 8-3.8 8-9 8-9-8-9-8z" />
                <circle cx="12" cy="12" r="2.5" />
              </>
            )}
          </svg>
          <span>{showPassword ? 'Ẩn' : 'Hiện'}</span>
        </button>
      </div>
      <small id="password-help">Bấm “Hiện” để kiểm tra mật khẩu trước khi đăng nhập.</small>

      <style jsx>{`
        .passwordField { gap: 8px; }
        .passwordLabelRow { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .passwordLabelRow label { font-size: 14px; font-weight: 800; }
        .forgotPassword { color: #245a3d; font-size: 13px; font-weight: 800; text-decoration: none; }
        .forgotPassword:hover { text-decoration: underline; text-underline-offset: 3px; }
        .passwordInputWrap { position: relative; }
        .passwordInputWrap input { width: 100%; padding-right: 92px; }
        .passwordToggle { position: absolute; top: 50%; right: 8px; transform: translateY(-50%); display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 10px; border: 0; border-radius: 9px; color: #314056; background: transparent; font-size: 12px; font-weight: 800; cursor: pointer; }
        .passwordToggle:hover { background: #eef2f5; }
        .passwordToggle:focus-visible { outline: 3px solid rgba(36,90,61,.22); outline-offset: 2px; }
        .passwordToggle svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
        small { color: #788493; font-size: 11px; line-height: 1.45; }
      `}</style>
    </div>
  );
}
