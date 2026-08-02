import './styles.css';
import './result-release.css';
import type { Metadata } from 'next';
import FileUploadEnhancer from './file-upload-enhancer';

const title = 'HTL HỒ SƠ CHUẨN';
const description = 'AI hỗ trợ phát hiện sớm rủi ro, kiểm tra hồ sơ và chỉ rõ việc cần xử lý trong doanh nghiệp.';
const siteUrl = 'https://htl-ho-so-chuan.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: `%s | ${title}`,
  },
  description,
  applicationName: title,
  keywords: [
    'hồ sơ doanh nghiệp',
    'kiểm tra tài liệu',
    'quản lý hồ sơ',
    'AI doanh nghiệp',
    'HTL Hồ Sơ Chuẩn',
  ],
  authors: [{ name: 'HTL' }],
  creator: 'HTL',
  publisher: 'HTL',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: siteUrl,
    siteName: title,
    title,
    description,
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  category: 'business',
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
