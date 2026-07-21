import Link from 'next/link';

const principles = [
  {
    number: '01',
    title: 'Chỉ kiểm tra khi cần làm rõ',
    text: 'Dành cho hồ sơ hoặc tài liệu khiến người dùng chưa chắc chắn và cần thêm một góc nhìn có căn cứ.',
  },
  {
    number: '02',
    title: 'Mọi nhận định đều có bằng chứng',
    text: 'HTL chỉ phân tích từ chính tài liệu người dùng tải lên, chỉ rõ điều quan sát được và vị trí cần kiểm tra lại.',
  },
  {
    number: '03',
    title: 'Con người quyết định cuối cùng',
    text: 'AI hỗ trợ đọc, đối chiếu và phát hiện điểm cần xác minh; người sử dụng luôn là người xem xét và quyết định.',
  },
];

const capabilities = [
  'Đọc nội dung, bảng biểu, dấu, chữ ký và thông tin định danh',
  'Đối chiếu ngày tháng, số liệu, tên gọi và tính nhất quán giữa nhiều tài liệu',
  'Chỉ ra điểm phù hợp, điểm mâu thuẫn, thông tin còn thiếu và nội dung cần xác minh thêm',
  'Đưa ra nhận định rõ ràng, giới hạn của nhận định và hành động nên thực hiện tiếp theo',
];

export default function HomePage() {
