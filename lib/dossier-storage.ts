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

export const DOSSIER_STORAGE_KEY = 'htl-dossiers-v1';
export const VERIFICATION_HISTORY_KEY = 'htl-verification-history-v1';
export const DOSSIER_CHECKLIST_KEY = 'htl-dossier-checklist-v1';

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
