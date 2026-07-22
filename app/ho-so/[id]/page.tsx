'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { evaluateDossierCompletion } from '../../../lib/dossier-completion';
import {
  ChecklistStatus,
  Dossier,
  DossierChecklistItem,
  StoredCrossCheckStatus,
  VerificationHistoryItem,
  ensureDossierChecklist,
  readDossiers,
  readDossierVerificationHistory,
  writeDossierChecklist,
} from '../../../lib/dossier-storage';

const checklistStatuses: ChecklistStatus[] = ['Chưa có', 'Đã có', 'Cần bổ sung'];

const crossCheckBadge: Record<StoredCrossCheckStatus, string> = {
  'THỐNG NHẤT': 'thông-tin',
  'KHÔNG THỐNG NHẤT': 'cao',
  'CHƯA ĐỦ DỮ LIỆU': 'trung-bình',
};

export default function DossierDetailPage() {
  const params = useParams<{ id: string }>();
  const dossierId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [history, setHistory] = useState<VerificationHistoryItem[]>([]);
  const [checklist, setChecklist] = useState<DossierChecklistItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const selected = readDossiers().find((item) => item.id === dossierId) || null;
    setDossier(selected);
    setHistory(readDossierVerificationHistory(dossierId));
    setChecklist(ensureDossierChecklist(dossierId, selected?.category || ''));
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

  const completion = useMemo(() => evaluateDossierCompletion(checklist), [checklist]);

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
            <p><strong>Mức độ hoàn thiện:</strong> {completion.percentage}%</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="resultHead">
          <div>
            <div className="eyebrow">ĐÁNH GIÁ TOÀN BỘ HỒ SƠ</div>
            <h2>{completion.level}</h2>
            <p className="leadResult">{completion.conclusion}</p>
          </div>
          <div className="score"><strong>{completion.percentage}%</strong><span>Mức độ hoàn thiện</span></div>
        </div>

        <div className="progressTrack"><span style={{ width: `${completion.percentage}%` }} /></div>

        <div className="twoCols">
          <div>
            <h3>Tài liệu bắt buộc còn thiếu</h3>
            {completion.missingRequired.length ? (
              <ul>{completion.missingRequired.map((item) => <li key={item.id}>{item.name}</li>)}</ul>
            ) : (
              <p>Không còn mục bắt buộc ở trạng thái “Chưa có”.</p>
            )}
          </div>
          <div>
            <h3>Tài liệu bắt buộc cần bổ sung</h3>
            {completion.needsSupplementRequired.length ? (
              <ul>{completion.needsSupplementRequired.map((item) => <li key={item.id}>{item.name}</li>)}</ul>
            ) : (
              <p>Không còn mục bắt buộc ở trạng thái “Cần bổ sung”.</p>
            )}
          </div>
        </div>

        {completion.optionalOutstanding.length > 0 && (
          <div className="notice">
            <h3>Tài liệu bổ sung nên cân nhắc</h3>
            <ul>{completion.optionalOutstanding.map((item) => <li key={item.id}>{item.name}</li>)}</ul>
          </div>
        )}

        <div className="finding">
          <h3>Khuyến nghị cho người xử lý</h3>
          <p>{completion.recommendation}</p>
          <p className="muted">Đánh giá này phản ánh mức độ hoàn thiện theo Checklist hiện tại; chưa khẳng định tính hợp lệ, hiệu lực hoặc khả năng được cơ quan hay đối tác chấp nhận.</p>
        </div>
      </section>

      <section className="panel">
        <div className="resultHead">
          <div>
            <div className="eyebrow">CHECKLIST HỒ SƠ CHUẨN</div>
            <h2>{completion.completedRequired}/{completion.requiredItems} tài liệu bắt buộc đã có</h2>
            <p className="muted">Checklist được tạo theo loại hồ sơ và có thể được người phụ trách điều chỉnh theo tình huống thực tế.</p>
          </div>
          <div className="score"><strong>{completion.percentage}%</strong><span>Mức độ hoàn thiện</span></div>
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
          {history.map((entry, index) => {
            const crossChecks = entry.crossChecks || [];
            const consistent = crossChecks.filter((item) => item.status === 'THỐNG NHẤT').length;
            const inconsistent = crossChecks.filter((item) => item.status === 'KHÔNG THỐNG NHẤT').length;
            const insufficient = crossChecks.filter((item) => item.status === 'CHƯA ĐỦ DỮ LIỆU').length;

            return (
              <article className="finding" key={entry.id}>
                <div className="resultHead">
                  <div><small>Lần kiểm tra {history.length - index} · {entry.createdAt}</small><h3>{entry.status}</h3></div>
                  <div className="score"><strong>{entry.confidence}%</strong><span>Mức độ tự tin</span></div>
                </div>
                <p className="leadResult">{entry.summary}</p>
                <p><strong>Tài liệu:</strong> {entry.fileNames.join(', ') || 'Không có tên tệp'}</p>
                <p><strong>Nội dung cần làm rõ:</strong> {entry.context || 'Không ghi thêm yêu cầu'}</p>

                {crossChecks.length > 0 && (
                  <div className="notice">
                    <h3>Kết quả đối chiếu chéo đã lưu</h3>
                    <p><strong>{consistent}</strong> trường thống nhất · <strong>{inconsistent}</strong> trường không thống nhất · <strong>{insufficient}</strong> trường chưa đủ dữ liệu.</p>
                    <div className="historyList">
                      {crossChecks.map((check, checkIndex) => (
                        <article className="finding" key={`${entry.id}-${check.field}-${checkIndex}`}>
                          <span className={`badge ${crossCheckBadge[check.status]}`}>{check.status}</span>
                          <h3>{check.field}</h3>
                          {check.values.length > 0 ? (
                            <ul>
                              {check.values.map((value, valueIndex) => (
                                <li key={`${value.value}-${valueIndex}`}><strong>{value.value}</strong> — {value.source}</li>
                              ))}
                            </ul>
                          ) : (
                            <p>Chưa có giá trị đủ rõ để so sánh.</p>
                          )}
                          <p><strong>Bằng chứng:</strong> {check.evidence}</p>
                          <p><strong>Khuyến nghị:</strong> {check.recommendation}</p>
                        </article>
                      ))}
                    </div>
                    <p className="muted">Kết quả này phản ánh dữ liệu tại thời điểm kiểm tra và cần được rà soát lại khi hồ sơ có tài liệu mới hoặc tài liệu được thay thế.</p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
