'use client';

import Link from 'next/link';
import { useFormStatus } from 'react-dom';

export default function LoginSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <>
      <button className="primary button loginSubmit" type="submit" disabled={pending} aria-busy={pending}>
        {pending ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Đang xác thực...
          </>
        ) : (
          <>
            Đăng nhập
            <span className="buttonArrow" aria-hidden="true">→</span>
          </>
        )}
      </button>

      <Link
        href="/dang-ky"
        className="primary secondary button loginSubmit"
        style={{ marginTop: 10, textAlign: 'center', display: 'block' }}
      >
        Đăng ký miễn phí
      </Link>

      <Link
        href="/quen-mat-khau"
        className="textLink"
        style={{ marginTop: 12, textAlign: 'center', display: 'block' }}
      >
        Quên mật khẩu?
      </Link>
    </>
  );
}
