import Link from 'next/link';

const principles = [
  {
    number: '01',
    title: 'Chỉ kiểm tra khi cần làm rõ',
    text: 'Ứng dụng dành cho những hồ sơ hoặc tài liệu khiến người dùng chưa chắc chắn và cần thêm một góc nhìn có căn cứ.',
  },
  {
    number: '02',
    title: 'Mọi nhận định đều có bằng chứng',
    text: 'HTL chỉ phân tích từ chính tài liệu người dùng tải lên, chỉ rõ nội dung quan sát được và vị trí cần kiểm tra lại.',
  },
  {
    number: '03',
    title: 'Con người quyết định cuối cùng',
    text: 'AI hỗ trợ đọc, đối chiếu và phát hiện điểm cần xác minh; người sử dụng luôn là người xem xét và quyết định.',
  },
];

export default function HomePage() {
  return (
    <main