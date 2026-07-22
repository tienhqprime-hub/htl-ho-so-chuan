import { VerificationHistoryItem } from './dossier-storage';

export type DossierVersionChange = {
  type: 'TÀI LIỆU MỚI' | 'TÀI LIỆU ĐÃ BỎ' | 'KẾT QUẢ THAY ĐỔI' | 'ĐỘ TIN CẬY THAY ĐỔI' | 'ĐỐI CHIẾU THAY ĐỔI';
  title: string;
  detail: string;
  significance: 'cao' | 'trung-bình' | 'thấp';
};

export type DossierVersion = {
  version: number;
  id: string;
  createdAt: string;
  status: string;
  confidence: number;
  summary: string;
  fileNames: string[];
  addedFiles: string[];
  removedFiles: string[];
  changes: DossierVersionChange[];
  conclusion: string;
};

function normalizeFiles(fileNames: string[]) {
  return Array.from(new Set(fileNames.map((name) => name.trim()).filter(Boolean)));
}

function difference(source: string[], comparison: string[]) {
  const comparisonSet = new Set(comparison);
  return source.filter((item) => !comparisonSet.has(item));
}

function crossCheckSignature(item: VerificationHistoryItem) {
  return new Map(
    (item.crossChecks || []).map((check) => [
      check.field,
      `${check.status}|${check.values.map((value) => `${value.value}@${value.source}`).join('|')}`,
    ])
  );
}

function compareCrossChecks(current: VerificationHistoryItem, previous?: VerificationHistoryItem) {
  if (!previous) return [];

  const currentMap = crossCheckSignature(current);
  const previousMap = crossCheckSignature(previous);
  const changedFields = new Set<string>();

  currentMap.forEach((signature, field) => {
    if (previousMap.get(field) !== signature) changedFields.add(field);
  });
  previousMap.forEach((_signature, field) => {
    if (!currentMap.has(field)) changedFields.add(field);
  });

  return Array.from(changedFields);
}

export function buildDossierVersions(history: VerificationHistoryItem[]): DossierVersion[] {
  const chronological = [...history].reverse();

  return chronological.map((entry, index) => {
    const previous = chronological[index - 1];
    const currentFiles = normalizeFiles(entry.fileNames);
    const previousFiles = normalizeFiles(previous?.fileNames || []);
    const addedFiles = difference(currentFiles, previousFiles);
    const removedFiles = previous ? difference(previousFiles, currentFiles) : [];
    const changes: DossierVersionChange[] = [];

    if (addedFiles.length) {
      changes.push({
        type: 'TÀI LIỆU MỚI',
        title: `${addedFiles.length} tài liệu mới`,
        detail: addedFiles.join(', '),
        significance: 'cao',
      });
    }

    if (removedFiles.length) {
      changes.push({
        type: 'TÀI LIỆU ĐÃ BỎ',
        title: `${removedFiles.length} tài liệu không còn trong lần kiểm tra`,
        detail: removedFiles.join(', '),
        significance: 'trung-bình',
      });
    }

    if (previous && entry.status !== previous.status) {
      changes.push({
        type: 'KẾT QUẢ THAY ĐỔI',
        title: `Kết quả chuyển từ “${previous.status}” sang “${entry.status}”`,
        detail: 'Cần xem lại tài liệu mới, tài liệu bị thay thế và bằng chứng trong hai lần kiểm tra.',
        significance: 'cao',
      });
    }

    if (previous && entry.confidence !== previous.confidence) {
      const differenceValue = entry.confidence - previous.confidence;
      changes.push({
        type: 'ĐỘ TIN CẬY THAY ĐỔI',
        title: `Mức độ tự tin ${differenceValue > 0 ? 'tăng' : 'giảm'} ${Math.abs(differenceValue)} điểm`,
        detail: `Từ ${previous.confidence}% lên ${entry.confidence}%.`,
        significance: Math.abs(differenceValue) >= 15 ? 'trung-bình' : 'thấp',
      });
    }

    const changedCrossCheckFields = compareCrossChecks(entry, previous);
    if (changedCrossCheckFields.length) {
      changes.push({
        type: 'ĐỐI CHIẾU THAY ĐỔI',
        title: `${changedCrossCheckFields.length} trường đối chiếu có thay đổi`,
        detail: changedCrossCheckFields.join(', '),
        significance: 'cao',
      });
    }

    const version = index + 1;
    let conclusion = 'Đây là phiên bản khởi tạo của hồ sơ.';
    if (previous && !changes.length) {
      conclusion = 'Không ghi nhận thay đổi đáng kể so với phiên bản trước.';
    } else if (previous) {
      const highPriority = changes.filter((change) => change.significance === 'cao').length;
      conclusion = highPriority
        ? `Phiên bản có ${highPriority} nhóm thay đổi quan trọng, nên được người phụ trách rà soát trước khi tiếp tục xử lý.`
        : 'Phiên bản có thay đổi nhưng chưa ghi nhận nhóm thay đổi ở mức ưu tiên cao.';
    }

    return {
      version,
      id: entry.id,
      createdAt: entry.createdAt,
      status: entry.status,
      confidence: entry.confidence,
      summary: entry.summary,
      fileNames: currentFiles,
      addedFiles,
      removedFiles,
      changes,
      conclusion,
    };
  }).reverse();
}
