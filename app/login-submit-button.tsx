'use client';

import { useFormStatus } from 'react-dom';

export default function LoginSubmitButton() {
  const { pending } = useFormStatus();

  return (
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
  );
}
