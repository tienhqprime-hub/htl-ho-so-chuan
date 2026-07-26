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
          required
        />
        <button
          className="passwordToggle"
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          aria-pressed={showPassword}
          title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          <span aria-hidden="true">{showPassword ? '◉' : '◌'}</span>
          <span className="passwordToggleText">{showPassword ? 'Ẩn' : 'Hiện'}</span>
        </button>
      </div>
    </div>
  );
}
