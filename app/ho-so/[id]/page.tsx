'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ChecklistStatus,
  Dossier,
  DossierChecklistItem,
  VerificationHistoryItem,
  readDossiers,
  readDossierChecklist,
  readDossierVerificationHistory,
  writeDossierChecklist,
} from '../../../lib/dossier-storage';

const defaultChecklistNames = [
  'Giấy chứng nhận đăng ký doanh nghiệp',
  'Điều lệ doanh nghiệp hiện hành',
  'Giấy tờ pháp lý của người đại diện',
  'Văn bản hoặc tài liệu làm căn cứ cho hồ sơ',
];

const checklistStatuses: ChecklistStatus[] = ['Chưa có', 'Đã có', 'Cần bổ sung'];

function createDefaultChecklist(dossierId: string): DossierChecklistItem[] {
  return defaultChecklistNames.map((name) => ({
    id: crypto.randomUUID(),
    dossierId,
    name,
    required: true,
    status: 'Chưa có',
    note: '',
  }));
}

export default function DossierDetailPage() {
  const params = useParams<{ id: string }>();
  const dossierId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [history, setHistory] = useState<VerificationHistoryItem[]>([]);
  const [checklist, setChecklist] = useState<DossierChecklistItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const selected = readDossiers().find((item) => item.id === dossierId) || null;
    const savedChecklist = readDossierChecklist(dossierId);
    const initialChecklist = savedChecklist.length ? savedChecklist : createDefaultChecklist(dossierId);

    setDossier(selected);
    setHistory(readDossierVerificationHistory(dossierId));
    setChecklist(initialChecklist);
    if (!savedChecklist.length) writeDossierChecklist(dossierId, initialChecklist);
    setReady(true);
  }, [dossierId]);

  useEffect(() => {
    if (ready) writeDossierChecklist(dossierId, checklist);
  }, [checklist, dossierId, ready]);

  const verificationUrl = useMemo(() => {
    if (!dossier) return '/kiem-tra';
    const query = new URLSearchParams({
      dossierId: dossier.id,
      code: dossier.code,
      name: dossier.name,
      company: dossier.company,
    });
    return `/kiem-tra?${query.toString()}`;
  }, [dossier]);

  const checklistSummary = useMemo(() => {
    const required = checklist.filter((item) => item.required);
    const completed = required.filter((item) => item.status === 'Đã có').length;
    const missing = required.filter((item) => item.status !== 'Đã có').length;
    const percentage = required.length ? Math.round((completed / required.length) * 100) : 100;
    return { required: required.length, completed, missing, percentage };
  }, [checklist]);

  function addChecklistItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('checklistName') || '').trim();
    if (!name) return;

    setChecklist((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        dossierId,
        name,
        required: data.get('required') === 'on',
        status: 'Chưa có',
        note: '',
      },
    ]);
    form.reset();
  }

  function updateChecklistItem(id: string, changes: Partial<DossierChecklistItem>) {
    setChecklist((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
  }

  function removeChecklistItem(id: string) {
    setChecklist((current) => current.filter((item) => item.id !== id));
  }

  if (!ready) {
    return <main className="shell"><section className="panel"><p>Đang mở hồ sơ…</p></section></main>;
  }

  if (!dossier) {
    return (
      <main className="shell narrow">
        <section className="panel">
          <div className="eyebrow">KHÔNG TÌM THẤY HỒ SƠ</div>
          <h1>Hồ sơ này không còn trên trình duyệt hiện tại.</h1>
          <p className="muted">Dữ liệu bản pilot đang được lưu cục bộ, nên hồ sơ có thể không xuất hiện khi đổi trình duyệt hoặc thiết bị.</p>
          <Link className="primary" href="/ho-so">Trở về danh sách hồ sơ</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <Link className="brand" href="/">HTL HỒ SƠ CHUẨN</Link>
          <div className="tagline">Chi tiết hồ sơ doanh nghiệp</div>
        </div>
        <div className="actions">
          <Link className="primary secondary" href="/ho-so">Danh sách hồ sơ</Link>
          <Link className="primary" href={verificationUrl}>Kiểm tra tài liệu</Link>
        </div>
      </header>

      <section className="panel">
        <div className="eyebrow">CHI TIẾT HỒ SƠ</div>
        <div className="resultHead">
          <div>
            <strong>{dossier.code}</strong>
            <h1>{dossier.name}</h1>
            <p className="leadResult muted">{dossier.company}</p>
          </div>
          <span className="badge">{dossier.status}</span>
        </div>

        <div className="twoCols">
          <div>
            <h3>Thông tin quản lý</h3>
            <p><strong>Loại hồ sơ:</strong> {dossier.category || 'Chưa phân loại'}</p>
            <p><strong>Người phụ trách:</strong> {dossier.owner || 'Chưa phân công'}</p>
            <p><strong>Ngày tạo:</strong> {dossier.createdAt}</p>
          </div>
          <div>
            <h3>Tình trạng xử lý</h3>
            <p><strong>Số lần kiểm tra:</strong> {history.length}</p>
            <p><strong>Kết quả gần nhất:</strong> {history[0]?.status || 'Chưa có kết quả'}</p>
            <p><strong>Mức độ hoàn thiện:</strong> {checklistSummary.percentage}%</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="resultHead">
          <div>
            <div className="eyebrow">CHECKLIST HỒ SƠ CHUẨN</div>
            <h2>{checklistSummary.percentage}% hoàn thiện</h2>
            <p className="muted">Đã có {checklistSummary.completed}/{checklistSummary.required} tài liệu bắt buộc; còn {checklistSummary.missing} mục cần xử lý.</p>
          </div>
          <div className="score"><strong>{checklistSummary.percentage}%</strong><span>Mức độ hoàn thiện</span></div>
        </div>

        <form className="dossierForm" onSubmit={addChecklistItem}>
          <input name="checklistName" placeholder="Tên tài liệu hoặc đầu việc cần theo dõi" required />
          <label><input name="required" type="checkbox" defaultChecked /> Bắt buộc</label>
          <button className="primary" type="submit">Thêm vào checklist</button>
        </form>

        <div className="historyList">
          {checklist.map((item) => (
            <article className="finding" key={item.id}>
              <div className="resultHead">
                <div>
                  <h3>{item.name}</h3>
                  <small>{item.required ? 'Tài liệu bắt buộc' : 'Tài liệu bổ sung'}</small>
                </div>
                <span className="badge">{item.status}</span>
              </div>

              <div className="dossierToolbar">
                <select value={item.status} onChange={(event) => updateChecklistItem(item.id, { status: event.target.value as ChecklistStatus })}>
                  {checklistStatuses.map((value) => <option key={value}>{value}</option>)}
                </select>
                <label>
                  <input type="checkbox" checked={item.required} onChange={(event) => updateChecklistItem(item.id, { required: event.target.checked })} /> Bắt buộc
                </label>
              </div>

              <textarea
                value={item.note}
                onChange={(event) => updateChecklistItem(item.id, { note: event.target.value })}
                placeholder="Ghi chú: tài liệu còn thiếu gì, cần chỉnh sửa hoặc bổ sung nội dung nào..."
              />

              <div className="actions">
                <button className="primary secondary" type="button" onClick={() => removeChecklistItem(item.id)}>Xóa mục</button>
              </div>
            </article>
          ))}
        </div>

        <div className="finding">
          <h3>Kết luận cho người xử lý</h3>
          <p>
            {checklistSummary.missing === 0
              ? 'Checklist cho thấy các tài liệu bắt buộc đã được đánh dấu là đã có. Nên thực hiện một lượt kiểm tra nội dung cuối cùng trước khi đóng hồ sơ.'
              : `Hồ sơ còn ${checklistSummary.missing} mục bắt buộc chưa hoàn tất. Nên ưu tiên các mục đang ở trạng thái “Cần bổ sung”, sau đó xử lý các mục “Chưa có”.`}
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="resultHead">
          <div>
            <div className="eyebrow">LỊCH SỬ KIỂM TRA</div>
            <h2>{history.length ? `${history.length} lần kiểm tra đã lưu` : 'Chưa có lần kiểm tra nào'}</h2>
          </div>
          <Link className="primary" href={verificationUrl}>Kiểm tra thêm tài liệu</Link>
        </div>

        {!history.length && <div className="emptyState">Hồ sơ chưa có kết quả kiểm tra. Hãy tải tài liệu lên để HTL rà soát.</div>}

        <div className="historyList">
          {history.map((entry, index) => (
            <article className="finding" key={entry.id}>
              <div className="resultHead">
                <div><small>Lần kiểm tra {history.length - index} · {entry.createdAt}</small><h3>{entry.status}</h3></div>
                <div className="score"><strong>{entry.confidence}%</strong><span>Mức độ tự tin</span></div>
              </div>
              <p className="leadResult">{entry.summary}</p>
              <p><strong>Tài liệu:</strong> {entry.fileNames.join(', ') || 'Không có tên tệp'}</p>
              <p><strong>Nội dung cần làm rõ:</strong> {entry.context || 'Không ghi thêm yêu cầu'}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
