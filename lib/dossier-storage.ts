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

export const DOSSIER_STORAGE_KEY = 'htl-dossiers-v1';
export const VERIFICATION_HISTORY_KEY = 'htl-verification-history-v1';

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

export function saveVerificationHistory(item: VerificationHistoryItem) {
  let current: VerificationHistoryItem[] = [];
  try {
    current = JSON.parse(localStorage.getItem(VERIFICATION_HISTORY_KEY) || '[]') as VerificationHistoryItem[];
  } catch {
    current = [];
  }
  localStorage.setItem(VERIFICATION_HISTORY_KEY, JSON.stringify([item, ...current]));
}
