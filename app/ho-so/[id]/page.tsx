'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { evaluateDossierCompletion } from '../../../lib/dossier-completion';
import { buildDossierVersions } from '../../../lib/dossier-versioning';
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

  const reportUrl = useMemo(
    () => dossier ? `/ho-so/${encodeURIComponent(dossier.id)}/bao-cao` : '/ho-so',
    [dossier]
  );

  const completion = useMemo(() => evaluateDossierCompletion(checklist), [checklist]);
  const versions = useMemo(() => buildDossierVersions(history), [history]);
  const latestVersion = versions[0];
  const totalImportantChanges = versions.reduce(
    (total, version) => total + version.changes.filter((change) => change.significance === 'cao').length,
    0
  );

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
          <Link className="primary secondary" href={reportUrl}>Báo cáo hồ sơ</Link>
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
            <p><strong>Phiên bản hiện tại:</strong> {latestVersion ? `v${latestVersion.version}` : 'Chưa có phiên bản'}</p>
            <p><strong>Kết quả gần nhất:</strong> {history[0]?.status || 'Chưa có kết quả'}</p>
            <p><strong>Mức độ hoàn thiện:</strong> {completion.percentage}%</p>
          </div>
        </div>

        <div className="actions">
          <Link className="primary" href={reportUrl}>Mở Báo cáo Hồ Sơ Chuẩn</Link>
          <span className="muted">Báo cáo tổng hợp Checklist, kết quả kiểm tra gần nhất và đối chiếu chéo để in hoặc lưu PDF.</span>
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
            <div className="eyebrow">DÒNG THỜI GIAN PHIÊN BẢN</div>
            <h2>{versions.length ? `${versions.length} phiên bản hồ sơ` : 'Chưa có phiên bản hồ sơ'}</h2>
            <p className="muted">Mỗi lần kiểm tra được coi là một phiên bản. Hệ thống so sánh với lần trước để chỉ ra tài liệu và kết quả đã thay đổi.</p>
          </div>
          <div className="score"><strong>{totalImportantChanges}</strong><span>Thay đổi quan trọng</span></div>
        </div>

        {!versions.length && (
          <div className="emptyState">Hãy thực hiện lần kiểm tra đầu tiên để tạo phiên bản khởi tạo của hồ sơ.</div>
        )}

        <div className="versionTimeline">
          {versions.map((version, index) => (
            <article className="versionEntry" key={version.id}>
              <div className="versionMarker"><span>v{version.version}</span></div>
              <div className="finding versionContent">
                <div className="resultHead">
                  <div>
                    <small>{index === 0 ? 'PHIÊN BẢN HIỆN TẠI' : 'PHIÊN BẢN TRƯỚC'} · {version.createdAt}</small>
                    <h3>{version.status}</h3>
                  </div>
                  <div className="score"><strong>{version.confidence}%</strong><span>Mức độ tự tin</span></div>
                </div>

                <p className="leadResult">{version.conclusion}</p>
                <p>{version.summary}</p>

                <div className="twoCols">
                  <div>
                    <h4>Tài liệu bổ sung</h4>
                    {version.addedFiles.length ? <ul>{version.addedFiles.map((file) => <li key={file}>{file}</li>)}</ul> : <p>Không có tài liệu mới.</p>}
                  </div>
                  <div>
                    <h4>Tài liệu không còn trong lần kiểm tra</h4>
                    {version.removedFiles.length ? <ul>{version.removedFiles.map((file) => <li key={file}>{file}</li>)}</ul> : <p>Không ghi nhận.</p>}
                  </div>
                </div>

                {version.changes.length > 0 ? (
                  <div className="versionChanges">
                    {version.changes.map((change, changeIndex) => (
                      <div className="notice" key={`${version.id}-${change.type}-${changeIndex}`}>
                        <span className={`badge ${change.significance}`}>{change.significance.toUpperCase()}</span>
                        <h4>{change.title}</h4>
                        <p><strong>{change.type}:</strong> {change.detail}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">Phiên bản này chưa ghi nhận nhóm thay đổi cần phân loại thêm.</p>
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="finding">
          <h3>Kết luận cho người sử dụng</h3>
          <p>{latestVersion ? latestVersion.conclusion : 'Chưa có dữ liệu để đánh giá sự thay đổi của hồ sơ.'}</p>
          <p className="muted">Việc một tài liệu không xuất hiện ở lần kiểm tra sau chưa đồng nghĩa tài liệu đã bị xóa khỏi hồ sơ gốc; kết quả chỉ phản ánh tập tài liệu được cung cấp trong từng lần kiểm tra.</p>
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

      <style jsx>{`
        .versionTimeline { display: grid; gap: 0; margin-top: 22px; }
        .versionEntry { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 18px; position: relative; padding-bottom: 22px; }
        .versionEntry:not(:last-child)::before { content: ''; position: absolute; left: 35px; top: 50px; bottom: 0; width: 2px; background: rgba(120, 120, 120, .28); }
        .versionMarker { display: flex; justify-content: center; position: relative; z-index: 1; }
        .versionMarker span { width: 58px; height: 58px; border-radius: 50%; display: grid; place-items: center; font-weight: 900; border: 2px solid currentColor; background: var(--background, #fff); }
        .versionContent { margin: 0; }
        .versionChanges { display: grid; gap: 10px; margin-top: 14px; }
        .versionChanges .notice { margin: 0; }
        @media (max-width: 720px) {
          .versionEntry { grid-template-columns: 48px minmax(0, 1fr); gap: 10px; }
          .versionEntry:not(:last-child)::before { left: 23px; }
          .versionMarker span { width: 44px; height: 44px; font-size: .85rem; }
        }
      `}</style>
    </main>
  );
}
