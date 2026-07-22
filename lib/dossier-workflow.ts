export type WorkflowStage =
  | 'Tiếp nhận'
  | 'Kiểm tra hồ sơ'
  | 'Yêu cầu bổ sung'
  | 'Chờ khách hàng bổ sung'
  | 'Đối chiếu'
  | 'Phê duyệt'
  | 'Hoàn thành';

export type WorkflowPriority = 'Thấp' | 'Bình thường' | 'Cao' | 'Khẩn cấp';

export type WorkflowEvent = {
  id: string;
  dossierId: string;
  fromStage: WorkflowStage | null;
  toStage: WorkflowStage;
  note: string;
  actor: string;
  createdAt: string;
};

export type DossierWorkflow = {
  dossierId: string;
  stage: WorkflowStage;
  priority: WorkflowPriority;
  dueDate: string;
  nextAction: string;
  updatedAt: string;
  events: WorkflowEvent[];
};

export const WORKFLOW_STAGES: WorkflowStage[] = [
  'Tiếp nhận',
  'Kiểm tra hồ sơ',
  'Yêu cầu bổ sung',
  'Chờ khách hàng bổ sung',
  'Đối chiếu',
  'Phê duyệt',
  'Hoàn thành',
];

export const WORKFLOW_PRIORITIES: WorkflowPriority[] = ['Thấp', 'Bình thường', 'Cao', 'Khẩn cấp'];

const WORKFLOW_STORAGE_KEY = 'htl-dossier-workflows-v1';

function readAll(): DossierWorkflow[] {
  try {
    return JSON.parse(localStorage.getItem(WORKFLOW_STORAGE_KEY) || '[]') as DossierWorkflow[];
  } catch {
    return [];
  }
}

function writeAll(items: DossierWorkflow[]) {
  localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(items));
}

export function createDefaultWorkflow(dossierId: string): DossierWorkflow {
  const now = new Date().toISOString();
  return {
    dossierId,
    stage: 'Tiếp nhận',
    priority: 'Bình thường',
    dueDate: '',
    nextAction: 'Kiểm tra danh mục tài liệu đã tiếp nhận.',
    updatedAt: now,
    events: [
      {
        id: crypto.randomUUID(),
        dossierId,
        fromStage: null,
        toStage: 'Tiếp nhận',
        note: 'Khởi tạo quy trình xử lý hồ sơ.',
        actor: 'Hệ thống',
        createdAt: now,
      },
    ],
  };
}

export function readDossierWorkflow(dossierId: string): DossierWorkflow {
  const existing = readAll().find((item) => item.dossierId === dossierId);
  if (existing) return existing;
  const created = createDefaultWorkflow(dossierId);
  writeDossierWorkflow(created);
  return created;
}

export function writeDossierWorkflow(workflow: DossierWorkflow) {
  const others = readAll().filter((item) => item.dossierId !== workflow.dossierId);
  writeAll([workflow, ...others]);
}

export function moveWorkflowStage(
  workflow: DossierWorkflow,
  toStage: WorkflowStage,
  note: string,
  actor: string,
): DossierWorkflow {
  if (workflow.stage === toStage && !note.trim()) return workflow;
  const now = new Date().toISOString();
  return {
    ...workflow,
    stage: toStage,
    updatedAt: now,
    events: [
      {
        id: crypto.randomUUID(),
        dossierId: workflow.dossierId,
        fromStage: workflow.stage,
        toStage,
        note: note.trim() || `Chuyển sang bước ${toStage}.`,
        actor: actor.trim() || 'Người xử lý',
        createdAt: now,
      },
      ...workflow.events,
    ],
  };
}

export function getWorkflowProgress(stage: WorkflowStage) {
  const index = WORKFLOW_STAGES.indexOf(stage);
  return Math.round(((index + 1) / WORKFLOW_STAGES.length) * 100);
}

export function getDeadlineState(dueDate: string) {
  if (!dueDate) return { label: 'Chưa đặt thời hạn', tone: 'trung-bình', days: null as number | null };
  const deadline = new Date(`${dueDate}T23:59:59`);
  const diff = Math.ceil((deadline.getTime() - Date.now()) / 86400000);
  if (diff < 0) return { label: `Quá hạn ${Math.abs(diff)} ngày`, tone: 'cao', days: diff };
  if (diff <= 3) return { label: `Còn ${diff} ngày`, tone: 'cao', days: diff };
  if (diff <= 7) return { label: `Còn ${diff} ngày`, tone: 'trung-bình', days: diff };
  return { label: `Còn ${diff} ngày`, tone: 'thông-tin', days: diff };
}
