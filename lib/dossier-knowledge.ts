import { DOSSIER_RULE_TEMPLATES, GENERAL_DOSSIER_TEMPLATE } from './dossier-rules';

export type KnowledgeRisk = 'Thấp' | 'Trung bình' | 'Cao';

export type KnowledgeGuide = {
  id: string;
  templateId: string;
  title: string;
  question: string;
  explanation: string;
  impact: string;
  recommendation: string;
  evidenceNeeded: string[];
  risk: KnowledgeRisk;
  confidence: number;
};

const templates = [GENERAL_DOSSIER_TEMPLATE, ...DOSSIER_RULE_TEMPLATES];

function riskFor(required: boolean): KnowledgeRisk {
  return required ? 'Cao' : 'Trung bình';
}

export const DOSSIER_KNOWLEDGE_GUIDES: KnowledgeGuide[] = templates.flatMap((template) =>
  template.items.map((item, index) => ({
    id: `${template.id}-${index + 1}`,
    templateId: template.id,
    title: item.name,
    question: `Vì sao cần ${item.name.toLowerCase()}?`,
    explanation: item.purpose,
    impact: item.required
      ? 'Nếu thiếu hoặc thông tin không đủ rõ, hồ sơ có thể chưa đủ căn cứ để tiếp tục kiểm tra, đối chiếu hoặc trình phê duyệt.'
      : 'Nếu thiếu, hồ sơ vẫn có thể tiếp tục trong một số tình huống nhưng mức độ rõ ràng và khả năng chứng minh có thể bị giảm.',
    recommendation: item.required
      ? 'Ưu tiên thu thập bản phù hợp, kiểm tra chủ thể phát hành, ngày lập, người ký và mối liên hệ với các tài liệu còn lại trước khi chuyển bước.'
      : 'Cân nhắc bổ sung khi tài liệu giúp làm rõ nội dung giao dịch, thẩm quyền, tiến độ hoặc căn cứ ra quyết định.',
    evidenceNeeded: [
      'Tên tài liệu và chủ thể phát hành',
      'Ngày lập, số hiệu hoặc phiên bản',
      'Người ký hoặc người có thẩm quyền',
      'Nội dung liên quan trực tiếp đến hồ sơ',
    ],
    risk: riskFor(item.required),
    confidence: 80,
  }))
);

export function getKnowledgeGuides(templateId?: string) {
  if (!templateId) return DOSSIER_KNOWLEDGE_GUIDES;
  return DOSSIER_KNOWLEDGE_GUIDES.filter((guide) => guide.templateId === templateId);
}

export function getKnowledgeTemplateName(templateId: string) {
  return templates.find((template) => template.id === templateId)?.name || 'Hồ sơ chưa xác định';
}

export function getKnowledgeTemplateOptions() {
  return templates.map((template) => ({ id: template.id, name: template.name }));
}
