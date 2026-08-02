import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'HTL Hồ Sơ Chuẩn - AI hỗ trợ kiểm tra hồ sơ và tài liệu doanh nghiệp';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: 'linear-gradient(135deg, #0f2340 0%, #17345f 56%, #1f8f63 100%)',
          color: '#ffffff',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 76,
              height: 76,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 22,
              background: '#ffffff',
              color: '#17345f',
              fontSize: 30,
              fontWeight: 900,
            }}
          >
            HTL
          </div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>HỒ SƠ CHUẨN 1.0</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 980 }}>
          <div style={{ fontSize: 66, lineHeight: 1.08, fontWeight: 900 }}>
            Kiểm tra hồ sơ, tài liệu doanh nghiệp bằng AI
          </div>
          <div style={{ fontSize: 29, lineHeight: 1.4, color: '#dce8f7' }}>
            Phát hiện sớm rủi ro, chỉ rõ điểm cần sửa và lập kế hoạch xử lý theo thứ tự ưu tiên.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 18, fontSize: 22, color: '#dce8f7' }}>
          <span>✓ Kiểm tra tài liệu</span>
          <span>✓ Đối chiếu hồ sơ</span>
          <span>✓ Kế hoạch hành động</span>
        </div>
      </div>
    ),
    size,
  );
}
