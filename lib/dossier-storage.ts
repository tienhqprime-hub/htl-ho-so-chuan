export type DossierStatus = 'Mới tiếp nhận' | 'Đang kiểm tra' | 'Chờ bổ sung' | 'Hoàn thành' | 'Đã đóng';

export type Dossier = {
  id: string;
  code: string;
  name: string;
  company: string;
  category: string;
  owner: string;
  status: DossierStatus;
  createdAt: string;
};

export type VerificationHistoryItem = {
  id: string;
  dossierId: string;
  dossierCode: string;
  dossierName: string;
  company: string;
  createdAt: string;
  fileNames: string[];
  context: string;
  status: string;
  confidence: number;
  summary: string;
};

export type ChecklistStatus = 'Chưa có' | 'Đã có' | 'Cần bổ sung';

export type DossierChecklistItem = {
  id: string;
  dossierId: string;
  name: string;
  required: boolean;
  status: ChecklistStatus;
  note: string;
};

export type ChecklistSyncResult = {
  updatedItemNames: string[];
  unmatchedFileNames: string[];
};

export const DOSSIER_STORAGE_KEY = 'htl-dossiers-v1';
export const VERIFICATION_HISTORY_KEY = 'htl-verification-history-v1';
export const DOSSIER_CHECKLIST_KEY = 'htl-dossier-checklist-v1';

export const DEFAULT_CHECKLIST_NAMES = [
  'Giấy chứng nhận đăng ký doanh nghiệp',
  'Điều lệ doanh nghiệp hiện hành',
  'Giấy tờ pháp lý của người đại diện',
  'Văn bản hoặc tài liệu làm căn cứ cho hồ sơ',
];

const CHECKLIST_FILE_ALIASES: Record<string, string[]> = {
  'Giấy chứng nhận đăng ký doanh nghiệp': ['dang ky doanh nghiep', 'dkkd', 'gcn dkkd', 'giay phep kinh doanh'],
  'Điều lệ doanh nghiệp hiện hành': ['dieu le', 'company charter', 'charter'],
  'Giấy tờ pháp lý của người đại diện': ['cccd', 'cmnd', 'can cuoc', 'ho chieu', 'passport', 'nguoi dai dien'],
  'Văn bản hoặc tài liệu làm căn cứ cho hồ sơ': ['hop dong', 'phu luc', 'quyet dinh', 'bien ban', 'van ban', 'tai lieu'],
};

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function readDossiers(): Dossier[] {
  try {
    return JSON.parse(localStorage.getItem(DOSSIER_STORAGE_KEY) || '[]') as Dossier[];
  } catch {
    return [];
  }
}

export function writeDossiers(items: Dossier[]) {
  localStorage.setItem(DOSSIER_STORAGE_KEY, JSON.stringify(items));
}

export function updateDossierStatus(dossierId: string, status: DossierStatus) {
  if (!dossierId) return;
  const dossiers = readDossiers();
  writeDossiers(dossiers.map((item) => item.id === dossierId ? { ...item, status } : item));
}

export function readVerificationHistory(): VerificationHistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(VERIFICATION_HISTORY_KEY) || '[]') as VerificationHistoryItem[];
  } catch {
    return [];
  }
}

export function readDossierVerificationHistory(dossierId: string): VerificationHistoryItem[] {
  return readVerificationHistory().filter((item) => item.dossierId === dossierId);
}

export function saveVerificationHistory(item: VerificationHistoryItem) {
  const current = readVerificationHistory();
  localStorage.setItem(VERIFICATION_HISTORY_KEY, JSON.stringify([item, ...current]));
}

export function readChecklist(): DossierChecklistItem[] {
  try {
    return JSON.parse(localStorage.getItem(DOSSIER_CHECKLIST_KEY) || '[]') as DossierChecklistItem[];
  } catch {
    return [];
  }
}

export function readDossierChecklist(dossierId: string): DossierChecklistItem[] {
  return readChecklist().filter((item) => item.dossierId === dossierId);
}

export function writeDossierChecklist(dossierId: string, items: DossierChecklistItem[]) {
  const otherItems = readChecklist().filter((item) => item.dossierId !== dossierId);
  localStorage.setItem(DOSSIER_CHECKLIST_KEY, JSON.stringify([...items, ...otherItems]));
}

export function ensureDossierChecklist(dossierId: string): DossierChecklistItem[] {
  const current = readDossierChecklist(dossierId);
  if (current.length) return current;

  const created = DEFAULT_CHECKLIST_NAMES.map((name) => ({
    id: crypto.randomUUID(),
    dossierId,
    name,
    required: true,
    status: 'Chưa có' as ChecklistStatus,
    note: '',
  }));

  writeDossierChecklist(dossierId, created);
  return created;
}

export function syncUploadedFilesToChecklist(dossierId: string, fileNames: string[]): ChecklistSyncResult {
  const checklist = ensureDossierChecklist(dossierId);
  const matchedFileNames = new Set<string>();
  const updatedItemNames: string[] = [];

  const updatedChecklist = checklist.map((item) => {
    const aliases = CHECKLIST_FILE_ALIASES[item.name] || [item.name];
    const matchingFiles = fileNames.filter((fileName) => {
      const normalizedFileName = normalizeText(fileName);
      return aliases.some((alias) => normalizedFileName.includes(normalizeText(alias)));
    });

    if (!matchingFiles.length) return item;

    matchingFiles.forEach((fileName) => matchedFileNames.add(fileName));
    updatedItemNames.push(item.name);

    return {
      ...item,
      status: 'Đã có' as ChecklistStatus,
      note: `Đã ghi nhận tệp tải lên: ${matchingFiles.join(', ')}. Trạng thái này chỉ xác nhận đã tiếp nhận tài liệu; cần kiểm tra nội dung trước khi kết luận tính phù hợp.`,
    };
  });

  writeDossierChecklist(dossierId, updatedChecklist);

  return {
    updatedItemNames,
    unmatchedFileNames: fileNames.filter((fileName) => !matchedFileNames.has(fileName)),
  };
}
