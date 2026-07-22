import type { DossierChecklistItem } from './dossier-storage';

export type DossierCompletionLevel = 'SẴN SÀNG RÀ SOÁT CUỐI' | 'NÊN BỔ SUNG TRƯỚC KHI TIẾP TỤC' | 'CHƯA NÊN TIẾP TỤC';

export type DossierCompletionReport = {
  percentage: number;
  totalItems: number;
  requiredItems: number;
  completedRequired: number;
  missingRequired: DossierChecklistItem[];
  needsSupplementRequired: DossierChecklistItem[];
  optionalOutstanding: DossierChecklistItem[];
  level: DossierCompletionLevel;
  conclusion: string;
  recommendation: string;
};

export function evaluateDossierCompletion(checklist: DossierChecklistItem[]): DossierCompletionReport {
  const requiredItems = checklist.filter((item) => item.required);
  const completedRequiredItems = requiredItems.filter((item) => item.status === 'Đã có');
  const missingRequired = requiredItems.filter((item) => item.status === 'Chưa có');
  const needsSupplementRequired = requiredItems.filter((item) => item.status === 'Cần bổ sung');
  const optionalOutstanding = checklist.filter((item) => !item.required && item.status !== 'Đã có');
  const percentage = requiredItems.length
    ? Math.round((completedRequiredItems.length / requiredItems.length) * 100)
    : 100;

  let level: DossierCompletionLevel;
  let conclusion: string;
  let recommendation: string;

  if (missingRequired.length > 0) {
    level = 'CHƯA NÊN TIẾP TỤC';
    conclusion = `Bộ hồ sơ còn thiếu ${missingRequired.length} tài liệu bắt buộc nên chưa đủ cơ sở để chuyển sang bước xử lý tiếp theo.`;
    recommendation = 'Ưu tiên thu thập các tài liệu bắt buộc đang ở trạng thái “Chưa có”, sau đó kiểm tra lại nội dung và tính phù hợp của từng tài liệu.';
  } else if (needsSupplementRequired.length > 0) {
    level = 'NÊN BỔ SUNG TRƯỚC KHI TIẾP TỤC';
    conclusion = `Các tài liệu bắt buộc đã được ghi nhận, nhưng còn ${needsSupplementRequired.length} mục cần bổ sung hoặc chỉnh sửa.`;
    recommendation = 'Chưa nên đóng hồ sơ. Hãy xử lý các mục “Cần bổ sung” và thực hiện lượt rà soát cuối trước khi chuyển bước.';
  } else {
    level = 'SẴN SÀNG RÀ SOÁT CUỐI';
    conclusion = 'Checklist cho thấy toàn bộ tài liệu bắt buộc đã được ghi nhận và không còn mục bắt buộc ở trạng thái cần bổ sung.';
    recommendation = optionalOutstanding.length
      ? `Có thể chuyển sang bước rà soát nội dung cuối. Đồng thời cân nhắc ${optionalOutstanding.length} tài liệu bổ sung chưa hoàn tất nếu chúng cần thiết cho giao dịch hoặc quy trình thực tế.`
      : 'Có thể chuyển sang bước rà soát nội dung cuối trước khi phê duyệt, nộp hoặc đóng hồ sơ.';
  }

  return {
    percentage,
    totalItems: checklist.length,
    requiredItems: requiredItems.length,
    completedRequired: completedRequiredItems.length,
    missingRequired,
    needsSupplementRequired,
    optionalOutstanding,
    level,
    conclusion,
    recommendation,
  };
}
