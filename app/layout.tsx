import './styles.css';
import type { Metadata } from 'next';
import FileUploadEnhancer from './file-upload-enhancer';

export const metadata: Metadata = {
  title: 'HTL HỒ SƠ CHUẨN',
  description: 'AI hỗ trợ kiểm chứng hồ sơ và tài liệu cần làm rõ.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <FileUploadEnhancer />
        {children}
      </body>
    </html>
  );
}
