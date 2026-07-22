import { evaluateDossierCompletion } from './dossier-completion';
import type {
  Dossier,
  DossierChecklistItem,
  VerificationHistoryItem,
} from './dossier-storage';
import type { DossierWorkflow } from './dossier-workflow';
import { getDeadlineState, getWorkflowProgress } from './dossier-workflow';

export type IntelligenceRiskLevel = 'THẤP' | 'TRUNG BÌNH' | 'CAO' | 'NGHIÊM TRỌNG';
export type IntelligenceReadinessLevel = 'CHƯA SẴN SÀNG' | 'CẦN BỔ SUNG' | 'SẴN SÀNG RÀ SOÁT' | 'SẴN SÀNG TRÌNH DUYỆT';

export type IntelligenceSignal = {
  id: string;
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  score: number;
  level: IntelligenceRiskLevel;
  evidence: string[];
};

export type DossierIntelligenceReport = {
  dossierId: string;
  generatedAt: string;
  readinessScore: number;
  readinessLevel: IntelligenceReadinessLevel;
  riskScore: number;
  riskLevel: IntelligenceRiskLevel;
  workflowProgress: number;
  completionPercentage: number;
  confidence: number;
  conclusion: string;
  recommendedNextAction: string;
  blockers: IntelligenceSignal[];
  warnings: IntelligenceSignal[];
  strengths: string[];
  evidenceGaps: string[];
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function riskLevel(score: number): IntelligenceRiskLevel {
  if (score >= 75) return 'NGHIÊM TRỌNG';
  if (score >= 50) return 'CAO';
  if (score >= 25) return 'TRUNG BÌNH';
  return 'THẤP';
}

function readinessLevel(score: number, hasBlocker: boolean): IntelligenceReadinessLevel {
  if (hasBlocker || score < 40) return 'CHƯA SẴN SÀNG';
  if (score < 65) return 'CẦN BỔ SUNG';
  if (score < 85) return 'SẴN SÀNG RÀ SOÁT';
  return 'SẴN SÀNG TRÌNH DUYỆT';
}

function buildSignal(
  id: string,
  title: string,
  description: string,
  impact: string,
  recommendation: string,
  score: number,
  evidence: string[],
): IntelligenceSignal {
  return {
    id,
    title,
    description,
    impact,
    recommendation,
    score,
    level: riskLevel(score),
    evidence,
  };
}

export function evaluateDossierIntelligence(input: {
  dossier: Dossier;
  checklist: DossierChecklistItem[];
  verificationHistory: VerificationHistoryItem[];
  workflow: DossierWorkflow;
}): DossierIntelligenceReport {
  const { dossier, checklist, verificationHistory, workflow } = input;
  const completion = evaluateDossierCompletion(checklist);
  const latestVerification = verificationHistory[0];
  const deadline = getDeadlineState(workflow.dueDate);
  const workflowProgress = getWorkflowProgress(workflow.stage);
  const crossChecks = latestVerification?.crossChecks || [];
  const inconsistent = crossChecks.filter((item) => item.status === 'KHÔNG THỐNG NHẤT');
  const insufficient = crossChecks.filter((item) => item.status === 'CHƯA ĐỦ DỮ LIỆU');

  const blockers: IntelligenceSignal[] = [];
  const warnings: IntelligenceSignal[] = [];
  const strengths: string[] = [];
  const evidenceGaps: string[] = [];

  if (completion.missingRequired.length) {
    blockers.push(buildSignal(
      'missing-required',
      `Thiếu ${completion.missingRequired.length} tài liệu bắt buộc`,
      completion.missingRequired.map((item) => item.name).join(' · '),
      'Hồ sơ chưa đủ nền tảng tài liệu để chuyển sang bước xử lý hoặc phê duyệt tiếp theo.',
      'Thu thập và kiểm tra từng tài liệu bắt buộc còn thiếu trước khi thay đổi trạng thái hồ sơ.',
      Math.min(100, 55 + completion.missingRequired.length * 10),
      completion.missingRequired.map((item) => item.name),
    ));
    evidenceGaps.push(...completion.missingRequired.map((item) => item.name));
  }

  if (completion.needsSupplementRequired.length) {
    warnings.push(buildSignal(
      'supplement-required',
      `${completion.needsSupplementRequired.length} tài liệu bắt buộc cần bổ sung`,
      completion.needsSupplementRequired.map((item) => item.name).join(' · '),
      'Tài liệu đã được ghi nhận nhưng chưa đủ rõ hoặc chưa đáp ứng yêu cầu kiểm tra hiện tại.',
      'Làm rõ nội dung, phiên bản, chủ thể phát hành, người ký và ghi chú nguyên nhân cần bổ sung.',
      Math.min(85, 35 + completion.needsSupplementRequired.length * 10),
      completion.needsSupplementRequired.map((item) => item.name),
    ));
    evidenceGaps.push(...completion.needsSupplementRequired.map((item) => `${item.name}: cần bổ sung`));
  }

  if (!latestVerification) {
    warnings.push(buildSignal(
      'no-verification',
      'Chưa có lượt kiểm tra tài liệu',
      'Hệ thống chưa ghi nhận kết quả kiểm tra hoặc đối chiếu gần nhất cho hồ sơ này.',
      'Không đủ dữ liệu để đánh giá chất lượng nội dung và sự thống nhất giữa các tài liệu.',
      'Thực hiện kiểm tra tài liệu và lưu kết quả vào lịch sử trước khi trình duyệt.',
      40,
      ['Lịch sử kiểm tra đang trống'],
    ));
    evidenceGaps.push('Kết quả kiểm tra tài liệu gần nhất');
  } else {
    strengths.push(`Đã có lượt kiểm tra gần nhất với độ tin cậy ${latestVerification.confidence}%.`);
  }

  if (inconsistent.length) {
    blockers.push(buildSignal(
      'inconsistent-fields',
      `${inconsistent.length} trường thông tin không thống nhất`,
      inconsistent.map((item) => item.field).join(' · '),
      'Các tài liệu đang thể hiện thông tin khác nhau, có thể dẫn đến quyết định dựa trên dữ liệu chưa được xác minh.',
      'Mở từng trường đối chiếu, kiểm tra nguồn phát hành và xác định tài liệu có giá trị làm căn cứ trước khi kết luận.',
      Math.min(100, 60 + inconsistent.length * 12),
      inconsistent.flatMap((item) => item.values.map((value) => `${item.field}: ${value.value} (${value.source})`)),
    ));
  }

  if (insufficient.length) {
    warnings.push(buildSignal(
      'insufficient-cross-check',
      `${insufficient.length} trường chưa đủ dữ liệu đối chiếu`,
      insufficient.map((item) => item.field).join(' · '),
      'Chưa có đủ nguồn độc lập hoặc nội dung rõ ràng để xác nhận thông tin.',
      'Bổ sung tài liệu hoặc bằng chứng có thể kiểm tra chéo cho từng trường đang thiếu dữ liệu.',
      Math.min(80, 30 + insufficient.length * 10),
      insufficient.map((item) => item.field),
    ));
    evidenceGaps.push(...insufficient.map((item) => `Bằng chứng đối chiếu cho ${item.field}`));
  }

  if (deadline.days !== null && deadline.days < 0 && workflow.stage !== 'Hoàn thành') {
    blockers.push(buildSignal(
      'overdue',
      deadline.label,
      `Hồ sơ đang ở bước ${workflow.stage} và đã vượt thời hạn đặt ra.`,
      'Việc chậm xử lý có thể làm tăng rủi ro vận hành, ảnh hưởng cam kết hoặc thời điểm thực hiện thủ tục.',
      'Xác định nguyên nhân quá hạn, cập nhật người chịu trách nhiệm và chốt đầu việc cần hoàn thành ngay.',
      Math.min(100, 70 + Math.abs(deadline.days) * 3),
      [workflow.dueDate, workflow.nextAction || 'Chưa có đầu việc tiếp theo'],
    ));
  } else if (deadline.days !== null && deadline.days <= 7 && workflow.stage !== 'Hoàn thành') {
    warnings.push(buildSignal(
      'due-soon',
      `Hồ sơ ${deadline.label.toLowerCase()}`,
      `Bước hiện tại: ${workflow.stage}.`,
      'Thời gian xử lý còn lại ngắn so với các điểm chưa hoàn tất trong hồ sơ.',
      'Ưu tiên các đầu việc đang chặn tiến độ và xác nhận khả năng hoàn thành trước thời hạn.',
      deadline.days <= 3 ? 55 : 35,
      [workflow.dueDate, workflow.nextAction || 'Chưa có đầu việc tiếp theo'],
    ));
  }

  if (!workflow.dueDate && workflow.stage !== 'Hoàn thành') {
    warnings.push(buildSignal(
      'missing-deadline',
      'Chưa đặt thời hạn xử lý',
      `Hồ sơ đang ở bước ${workflow.stage} nhưng chưa có ngày cần hoàn thành.`,
      'Không có mốc thời gian để theo dõi tiến độ và cảnh báo chậm xử lý.',
      'Đặt thời hạn phù hợp với loại hồ sơ và xác định đầu việc tiếp theo.',
      25,
      ['Trường thời hạn workflow đang trống'],
    ));
  }

  if (!workflow.nextAction.trim() && workflow.stage !== 'Hoàn thành') {
    warnings.push(buildSignal(
      'missing-next-action',
      'Chưa xác định việc cần làm tiếp theo',
      'Workflow chưa có đầu việc cụ thể để người phụ trách tiếp tục xử lý.',
      'Hồ sơ có thể bị dừng hoặc chuyển bước mà không có căn cứ hành động rõ ràng.',
      'Ghi một đầu việc có thể thực hiện, người phụ trách và kết quả mong đợi.',
      30,
      ['Trường việc cần làm tiếp theo đang trống'],
    ));
  }

  if (workflow.priority === 'Khẩn cấp') {
    warnings.push(buildSignal(
      'urgent-priority',
      'Hồ sơ được đánh dấu khẩn cấp',
      'Mức ưu tiên workflow hiện tại là Khẩn cấp.',
      'Hồ sơ cần được bố trí nguồn lực và theo dõi sát hơn các hồ sơ thông thường.',
      'Xác nhận người chịu trách nhiệm, thời hạn và đầu việc cụ thể trong ngày.',
      45,
      [workflow.priority, workflow.nextAction || 'Chưa có đầu việc'],
    ));
  }

  if (completion.percentage === 100) strengths.push('Toàn bộ tài liệu bắt buộc đã được ghi nhận trong checklist.');
  if (inconsistent.length === 0 && latestVerification) strengths.push('Lượt kiểm tra gần nhất không ghi nhận trường thông tin không thống nhất.');
  if (workflow.stage === 'Phê duyệt') strengths.push('Hồ sơ đã được chuyển đến bước phê duyệt trong workflow.');
  if (workflow.stage === 'Hoàn thành') strengths.push('Workflow đã được đánh dấu hoàn thành.');
  if (workflow.dueDate && deadline.days !== null && deadline.days > 7) strengths.push(`Thời hạn còn ${deadline.days} ngày, chưa nằm trong nhóm cảnh báo gần hạn.`);

  const riskScore = clamp(
    blockers.reduce((sum, item) => sum + item.score * 0.55, 0)
      + warnings.reduce((sum, item) => sum + item.score * 0.2, 0),
  );

  const verificationConfidence = latestVerification?.confidence ?? 35;
  const evidenceCoverage = crossChecks.length
    ? clamp(((crossChecks.length - insufficient.length - inconsistent.length) / crossChecks.length) * 100)
    : latestVerification ? 55 : 20;

  const readinessScore = clamp(
    completion.percentage * 0.42
      + workflowProgress * 0.18
      + verificationConfidence * 0.2
      + evidenceCoverage * 0.2
      - riskScore * 0.45,
  );

  const hasBlocker = blockers.length > 0;
  const readiness = readinessLevel(readinessScore, hasBlocker);
  const risk = riskLevel(riskScore);
  const confidence = clamp(
    (latestVerification ? 35 : 10)
      + Math.min(25, checklist.length * 3)
      + Math.min(20, crossChecks.length * 4)
      + (workflow.dueDate ? 10 : 0)
      + (workflow.nextAction.trim() ? 10 : 0),
  );

  let conclusion = `Hồ sơ được đánh giá ở mức ${readiness.toLowerCase()}, với rủi ro ${risk.toLowerCase()}.`;
  if (hasBlocker) {
    conclusion += ` Có ${blockers.length} điểm đang chặn khả năng tiếp tục hoặc trình duyệt.`;
  } else if (warnings.length) {
    conclusion += ` Không có điểm chặn trực tiếp, nhưng còn ${warnings.length} cảnh báo cần xử lý hoặc xác nhận.`;
  } else {
    conclusion += ' Chưa ghi nhận điểm chặn hoặc cảnh báo đáng kể từ dữ liệu hiện có.';
  }

  const recommendedNextAction = blockers[0]?.recommendation
    || warnings[0]?.recommendation
    || (workflow.stage === 'Hoàn thành'
      ? 'Lưu trữ hồ sơ, bảo toàn lịch sử kiểm tra và theo dõi yêu cầu phát sinh sau hoàn thành.'
      : 'Thực hiện rà soát cuối, xác nhận bằng chứng và cập nhật workflow trước khi chuyển bước tiếp theo.');

  return {
    dossierId: dossier.id,
    generatedAt: new Date().toISOString(),
    readinessScore,
    readinessLevel: readiness,
    riskScore,
    riskLevel: risk,
    workflowProgress,
    completionPercentage: completion.percentage,
    confidence,
    conclusion,
    recommendedNextAction,
    blockers,
    warnings,
    strengths,
    evidenceGaps: Array.from(new Set(evidenceGaps)),
  };
}
