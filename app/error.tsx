'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('HTL application error:', error);
  }, [error]);

  return (
    <main className="shell narrow">
      <section className="panel" style={{ textAlign: 'center', padding: '64px 28px' }}>
        <div className="eyebrow">HTL HỒ SƠ CHUẨN</div>
        <p style={{ margin: '10px 0 0', fontSize: 52, lineHeight: 1 }}>⚠️</p>
        <h1>HTL đang gặp lỗi tạm thời.</h1>
        <p className="leadResult muted" style={{ maxWidth: 640, margin: '0 auto 28px' }}>
          Dữ liệu anh/chị vừa chọn chưa bị tự động thay đổi. Hãy thử tải lại chức năng này; nếu lỗi vẫn còn, quay về trang chủ rồi thực hiện lại.
        </p>
        <div className="actions" style={{ justifyContent: 'center' }}>
          <button className="primary" type="button" onClick={reset}>Thử lại</button>
          <button className="primary secondary" type="button" onClick={() => { window.location.href = '/'; }}>Về trang chủ</button>
        </div>
        {error.digest && (
          <p className="muted" style={{ marginTop: 22, fontSize: 12 }}>
            Mã tham chiếu: {error.digest}
          </p>
        )}
      </section>
    </main>
  );
}
