export type DossierRuleItem = {
  name: string;
  required: boolean;
  purpose: string;
};

export type DossierRuleTemplate = {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  items: DossierRuleItem[];
};

export const GENERAL_DOSSIER_TEMPLATE: DossierRuleTemplate = {
  id: 'general-business-dossier',
  name: 'Hồ sơ doanh nghiệp tổng quát',
  aliases: ['chung', 'tong quat', 'doanh nghiep', 'ho so doanh nghiep'],
  description: 'Mẫu Pilot dùng để rà soát thành phần nền tảng khi loại hồ sơ chưa được xác định rõ.',
  items: [
    {
      name: 'Giấy chứng nhận đăng ký doanh nghiệp',
      required: true,
      purpose: 'Đối chiếu thông tin nhận diện pháp nhân, mã số doanh nghiệp, trụ sở và người đại diện.',
    },
    {
      name: 'Điều lệ doanh nghiệp hiện hành',
      required: true,
      purpose: 'Đối chiếu cơ cấu, vốn, thẩm quyền và nguyên tắc quản trị nội bộ.',
    },
    {
      name: 'Giấy tờ pháp lý của người đại diện',
      required: true,
      purpose: 'Đối chiếu thông tin định danh của người ký hoặc người đại diện.',
    },
    {
      name: 'Văn bản hoặc tài liệu làm căn cứ cho hồ sơ',
      required: true,
      purpose: 'Ghi nhận hợp đồng, quyết định, biên bản, phụ lục hoặc tài liệu nghiệp vụ liên quan.',
    },
  ],
};

export const DOSSIER_RULE_TEMPLATES: DossierRuleTemplate[] = [
  {
    id: 'business-establishment',
    name: 'Thành lập doanh nghiệp',
    aliases: ['thanh lap', 'dang ky thanh lap', 'mo cong ty', 'thanh lap doanh nghiep'],
    description: 'Mẫu Pilot để kiểm tra bộ tài liệu nền tảng phục vụ việc chuẩn bị hồ sơ thành lập.',
    items: [
      { name: 'Giấy đề nghị đăng ký doanh nghiệp', required: true, purpose: 'Ghi nhận nội dung đề nghị đăng ký và thông tin doanh nghiệp dự kiến.' },
      { name: 'Điều lệ doanh nghiệp', required: true, purpose: 'Đối chiếu tên, trụ sở, ngành nghề, vốn và cơ cấu quản trị dự kiến.' },
      { name: 'Danh sách thành viên hoặc cổ đông sáng lập', required: true, purpose: 'Đối chiếu chủ thể góp vốn, tỷ lệ và thông tin định danh.' },
      { name: 'Giấy tờ pháp lý của cá nhân hoặc tổ chức tham gia', required: true, purpose: 'Đối chiếu tư cách và thông tin nhận diện của các chủ thể tham gia.' },
      { name: 'Văn bản ủy quyền thực hiện thủ tục', required: false, purpose: 'Ghi nhận phạm vi đại diện khi người nộp hồ sơ không trực tiếp thực hiện.' },
    ],
  },
  {
    id: 'business-registration-change',
    name: 'Thay đổi đăng ký doanh nghiệp',
    aliases: ['thay doi dang ky', 'thay doi dkkd', 'thay doi doanh nghiep', 'dang ky thay doi'],
    description: 'Mẫu Pilot để rà soát căn cứ nội bộ và tài liệu thể hiện nội dung thay đổi.',
    items: [
      { name: 'Giấy chứng nhận đăng ký doanh nghiệp hiện tại', required: true, purpose: 'Làm mốc đối chiếu thông tin trước khi thay đổi.' },
      { name: 'Thông báo hoặc giấy đề nghị đăng ký thay đổi', required: true, purpose: 'Xác định chính xác nội dung doanh nghiệp đề nghị thay đổi.' },
      { name: 'Quyết định của chủ sở hữu hoặc cơ quan có thẩm quyền', required: true, purpose: 'Đối chiếu thẩm quyền và nội dung đã được thông qua.' },
      { name: 'Biên bản họp liên quan đến nội dung thay đổi', required: false, purpose: 'Đối chiếu quá trình biểu quyết khi loại hình doanh nghiệp yêu cầu họp.' },
      { name: 'Điều lệ sửa đổi hoặc tài liệu cập nhật', required: false, purpose: 'Đối chiếu các điều khoản bị ảnh hưởng bởi nội dung thay đổi.' },
      { name: 'Tài liệu chứng minh nội dung thay đổi', required: false, purpose: 'Ghi nhận giấy tờ về địa chỉ, vốn, người đại diện hoặc chủ thể liên quan.' },
    ],
  },
  {
    id: 'commercial-contract',
    name: 'Hợp đồng thương mại',
    aliases: ['hop dong', 'hop dong thuong mai', 'giao dich', 'mua ban', 'dich vu'],
    description: 'Mẫu Pilot để rà soát chủ thể, thẩm quyền, nội dung giao dịch và tài liệu kèm theo.',
    items: [
      { name: 'Dự thảo hoặc bản hợp đồng', required: true, purpose: 'Đối chiếu chủ thể, đối tượng, giá trị, nghĩa vụ, thời hạn và cơ chế xử lý vi phạm.' },
      { name: 'Giấy chứng nhận đăng ký doanh nghiệp của các bên', required: true, purpose: 'Đối chiếu tên pháp lý, mã số, địa chỉ và người đại diện.' },
      { name: 'Tài liệu chứng minh thẩm quyền người ký', required: true, purpose: 'Xác định căn cứ đại diện hoặc phạm vi ủy quyền của người ký.' },
      { name: 'Phụ lục, báo giá hoặc phạm vi công việc', required: false, purpose: 'Làm rõ hàng hóa, dịch vụ, tiêu chuẩn, số lượng và tiến độ.' },
      { name: 'Biên bản nghiệm thu, bàn giao hoặc đối soát', required: false, purpose: 'Ghi nhận căn cứ thực hiện, thanh toán hoặc hoàn thành nghĩa vụ.' },
    ],
  },
  {
    id: 'internal-corporate',
    name: 'Hồ sơ quản trị nội bộ',
    aliases: ['noi bo', 'quan tri noi bo', 'bien ban hop', 'quyet dinh noi bo'],
    description: 'Mẫu Pilot để rà soát quyết định, biên bản và căn cứ thẩm quyền trong doanh nghiệp.',
    items: [
      { name: 'Điều lệ doanh nghiệp hiện hành', required: true, purpose: 'Xác định cơ quan, chức danh và thẩm quyền ra quyết định.' },
      { name: 'Thông báo mời họp hoặc tài liệu lấy ý kiến', required: false, purpose: 'Đối chiếu trình tự chuẩn bị và phạm vi nội dung được xem xét.' },
      { name: 'Biên bản họp hoặc biên bản kiểm phiếu', required: true, purpose: 'Ghi nhận người tham dự, diễn biến, tỷ lệ biểu quyết và kết quả.' },
      { name: 'Nghị quyết hoặc quyết định', required: true, purpose: 'Đối chiếu nội dung được thông qua, hiệu lực và người ký.' },
      { name: 'Tài liệu kèm theo làm căn cứ quyết định', required: false, purpose: 'Ghi nhận đề xuất, báo cáo, hợp đồng hoặc chứng từ liên quan.' },
    ],
  },
];

export function normalizeRuleText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function getDossierRuleTemplate(category: string): DossierRuleTemplate {
  const normalizedCategory = normalizeRuleText(category || '');
  if (!normalizedCategory) return GENERAL_DOSSIER_TEMPLATE;

  const match = DOSSIER_RULE_TEMPLATES.find((template) =>
    template.aliases.some((alias) => {
      const normalizedAlias = normalizeRuleText(alias);
      return normalizedCategory.includes(normalizedAlias) || normalizedAlias.includes(normalizedCategory);
    })
  );

  return match || GENERAL_DOSSIER_TEMPLATE;
}

export function getDossierCategoryOptions() {
  return DOSSIER_RULE_TEMPLATES.map((template) => template.name);
}
