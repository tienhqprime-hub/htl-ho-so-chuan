'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { evaluateDossierCompletion } from '../../../../lib/dossier-completion';
import {
  Dossier,
  DossierChecklistItem,
  VerificationHistoryItem,
  readDossiers,
  readDossierChecklist,
  readDossierVerificationHistory,
} from '../../../../lib/dossier-storage';

type ReportMetadata = {
  version: string;
  preparedBy: string;
  approvedBy: string;
  approvalTitle: string;
  note: string;
};

const defaultMetadata: ReportMetadata = {
  version: '1.0',
  preparedBy: '',
  approvedBy: '',
  approvalTitle: 'Người phê duyệt',
  note: '',
};

export default function DossierReportPage() {
  const params = useParams<{ id: string }>();
  const dossierId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [checklist, setChecklist] = useState<DossierChecklistItem[]>([]);
  const [history, setHistory] = useState<VerificationHistoryItem[]>([]);
  const [metadata, setMetadata] = useState<ReportMetadata>(defaultMetadata);
  const [ready, setReady] = useState(false);

  const metadataKey = `htl-report-metadata:${dossierId}`;

  useEffect(() => {
    const selected = readDossiers().find((item) => item.id === dossierId) || null;
    setDossier(selected);
    setChecklist(readDossierChecklist(dossierId));
    setHistory(readDossierVerificationHistory(dossierId));

    try {
      const saved = localStorage.getItem(metadataKey);
      if (saved) {
        setMetadata({ ...defaultMetadata, ...JSON.parse(saved) });
      } else if (selected?.owner) {
        setMetadata((current) => ({ ...current, preparedBy: selected.owner }));
      }
    } catch {
      if (selected?.owner) setMetadata((current) => ({ ...current, preparedBy: selected.owner }));
    }

    setReady(true);
  }, [dossierId, metadataKey]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(metadataKey, JSON.stringify(metadata));
  }, [metadata, metadataKey, ready]);

  const completion = useMemo(() => evaluateDossierCompletion(checklist), [checklist]);
  const latest = history[0];
  const latestChecks = latest?.crossChecks || [];
  const inconsistentChecks = latestChecks.filter((item) => item.status === 'KHÔNG THỐNG NHẤT');
  const insufficientChecks = latestChecks.filter((item) => item.status === 'CHƯA ĐỦ DỮ LIỆU');
  const generatedAt = useMemo(() => new Date().toLocaleString('vi-VN'), []);
  const generatedDate = useMemo(() => new Date().toLocaleDateString('vi-VN'), []);
  const reportCode = useMemo(() => {
    const normalizedCode = (dossier?.code || dossierId).replace(/[^a-zA-Z0-9-]/g, '-').toUpperCase();
    const dateCode = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    return `HTL-${normalizedCode}-${dateCode}`;
  }, [dossier?.code, dossierId]);

  function updateMetadata(field: keyof ReportMetadata, value: string) {
    setMetadata((current) => ({ ...current, [field]: value }));
  }

  if (!ready) {
    return <main className="shell narrow"><section className="panel"><p>Đang lập báo cáo…</p></section></main>;
  }

  if (!dossier) {
    return (
      <main className="shell narrow">
        <section className="panel">
          <div className="eyebrow">KHÔNG TÌM THẤY HỒ SƠ</div>
          <h1>Không thể lập báo cáo cho hồ sơ này.</h1>
          <p className="muted">Dữ liệu bản pilot đang được lưu trên trình duyệt hiện tại.</p>
          <Link className="primary" href="/ho-so">Trở về danh sách hồ sơ</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="shell narrow reportPage">
      <header className="topbar noPrint">
        <Link className="brand" href="/">HTL HỒ SƠ CHUẨN</Link>
        <div className="actions">
          <Link className="primary secondary" href={`/ho-so/${encodeURIComponent(dossier.id)}`}>Trở về hồ sơ</Link>
          <button className="primary" onClick={() => window.print()}>In hoặc lưu PDF</button>
        </div>
      </header>

      <section className="panel noPrint">
        <div className="eyebrow">THÔNG TIN TRÌNH KÝ</div>
        <h2>Hoàn thiện thông tin trước khi in báo cáo</h2>
        <div className="reportFields">
          <label>Phiên bản<input value={metadata.version} onChange={(event) => updateMetadata('version', event.target.value)} /></label>
          <label>Người lập báo cáo<input value={metadata.preparedBy} onChange={(event) => updateMetadata('preparedBy', event.target.value)} placeholder="Họ và tên" /></label>
          <label>Người phê duyệt<input value={metadata.approvedBy} onChange={(event) => updateMetadata('approvedBy', event.target.value)} placeholder="Họ và tên" /></label>
          <label>Chức danh người duyệt<input value={metadata.approvalTitle} onChange={(event) => updateMetadata('approvalTitle', event.target.value)} /></label>
        </div>
        <label className="reportNote">Ghi chú báo cáo<textarea value={metadata.note} onChange={(event) => updateMetadata('note', event.target.value)} placeholder="Phạm vi sử dụng, yêu cầu xử lý tiếp theo hoặc ghi chú trình duyệt..." /></label>
        <p className="muted">Thông tin này được lưu trên trình duyệt hiện tại để sử dụng lại khi mở báo cáo.</p>
      </section>

      <section className="panel result reportCover">
        <div className="reportIdentity">
          <div>
            <div className="reportBrand">HTL HỒ SƠ CHUẨN</div>
            <div className="muted">Hệ thống hỗ trợ kiểm soát hồ sơ doanh nghiệp</div>
          </div>
          <div className="reportMetaBox">
            <div><strong>Mã báo cáo</strong><span>{reportCode}</span></div>
            <div><strong>Phiên bản</strong><span>{metadata.version || '1.0'}</span></div>
            <div><strong>Ngày lập</strong><span>{generatedDate}</span></div>
          </div>
        </div>
        <div className="reportTitle">
          <div className="eyebrow">BÁO CÁO HỒ SƠ CHUẨN</div>
          <h1>{dossier.name}</h1>
          <p className="leadResult">{dossier.company}</p>
        </div>
        <div className="twoCols">
          <div>
            <p><strong>Mã hồ sơ:</strong> {dossier.code}</p>
            <p><strong>Loại hồ sơ:</strong> {dossier.category || 'Chưa phân loại'}</p>
            <p><strong>Người phụ trách:</strong> {dossier.owner || 'Chưa phân công'}</p>
          </div>
          <div>
            <p><strong>Ngày tạo hồ sơ:</strong> {dossier.createdAt}</p>
            <p><strong>Thời điểm lập báo cáo:</strong> {generatedAt}</p>
            <p><strong>Trạng thái quản lý:</strong> {dossier.status}</p>
          </div>
        </div>
      </section>

      <section className="panel reportSection">
        <div className="resultHead">
          <div>
            <div className="eyebrow">01 · KẾT LUẬN TỔNG THỂ</div>
            <h2>{completion.level}</h2>
            <p className="leadResult">{completion.conclusion}</p>
          </div>
          <div className="score"><strong>{completion.percentage}%</strong><span>Mức độ hoàn thiện</span></div>
        </div>
        <div className="progressTrack"><span style={{ width: `${completion.percentage}%` }} /></div>
        <div className="finding">
          <h3>Khuyến nghị xử lý</h3>
          <p>{completion.recommendation}</p>
        </div>
      </section>

      <section className="panel reportSection">
        <div className="eyebrow">02 · DANH MỤC TÀI LIỆU</div>
        <h2>Checklist hồ sơ</h2>
        <div className="historyList">
          {checklist.map((item) => (
            <article className="finding reportItem" key={item.id}>
              <div className="resultHead">
                <div><h3>{item.name}</h3><small>{item.required ? 'Tài liệu bắt buộc' : 'Tài liệu bổ sung'}</small></div>
                <span className="badge">{item.status}</span>
              </div>
              <p>{item.note || 'Chưa có ghi chú.'}</p>
            </article>
          ))}
          {!checklist.length && <div className="emptyState">Chưa có Checklist để đưa vào báo cáo.</div>}
        </div>
      </section>

      <section className="panel reportSection">
        <div className="eyebrow">03 · KẾT QUẢ KIỂM TRA GẦN NHẤT</div>
        {latest ? (
          <>
            <div className="resultHead">
              <div><h2>{latest.status}</h2><small>{latest.createdAt}</small></div>
              <div className="score"><strong>{latest.confidence}%</strong><span>Mức độ tự tin</span></div>
            </div>
            <p className="leadResult">{latest.summary}</p>
            <p><strong>Tài liệu đã kiểm tra:</strong> {latest.fileNames.join(', ') || 'Không có tên tệp'}</p>
            <p><strong>Nội dung cần làm rõ:</strong> {latest.context || 'Không ghi thêm yêu cầu'}</p>
          </>
        ) : (
          <div className="emptyState">Hồ sơ chưa có lần kiểm tra nào.</div>
        )}
      </section>

      {latestChecks.length > 0 && (
        <section className="panel reportSection">
          <div className="eyebrow">04 · ĐỐI CHIẾU CHÉO</div>
          <h2>{inconsistentChecks.length ? `${inconsistentChecks.length} trường không thống nhất` : 'Chưa phát hiện trường không thống nhất'}</h2>
          <div className="twoCols">
            <div><h3>Cần ưu tiên xác minh</h3><p>{inconsistentChecks.length} trường không thống nhất.</p></div>
            <div><h3>Còn thiếu căn cứ</h3><p>{insufficientChecks.length} trường chưa đủ dữ liệu.</p></div>
          </div>
          <div className="historyList">
            {latestChecks.map((check, index) => (
              <article className="finding reportItem" key={`${check.field}-${index}`}>
                <span className="badge">{check.status}</span>
                <h3>{check.field}</h3>
                {check.values.length > 0 && (
                  <ul>
                    {check.values.map((value, valueIndex) => (
                      <li key={`${value.value}-${valueIndex}`}><strong>{value.value}</strong> — {value.source}</li>
                    ))}
                  </ul>
                )}
                <p><strong>Bằng chứng:</strong> {check.evidence}</p>
                <p><strong>Khuyến nghị:</strong> {check.recommendation}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="panel reportSection">
        <div className="eyebrow">05 · GHI CHÚ VÀ PHẠM VI</div>
        {metadata.note && <div className="finding"><h3>Ghi chú trình duyệt</h3><p>{metadata.note}</p></div>}
        <p>Báo cáo được tổng hợp từ dữ liệu và tài liệu người dùng đã cung cấp tại các lần kiểm tra được lưu trên trình duyệt hiện tại.</p>
        <p className="muted">Báo cáo hỗ trợ rà soát và ra quyết định nội bộ; không thay thế giám định, công chứng, xác nhận của cơ quan cấp phát hoặc tư vấn pháp lý chuyên môn.</p>
      </section>

      <section className="panel reportSection signatureSection">
        <div className="signatureBox">
          <strong>NGƯỜI LẬP BÁO CÁO</strong>
          <span>Ký, ghi rõ họ tên</span>
          <div className="signatureSpace" />
          <b>{metadata.preparedBy || 'Chưa ghi tên'}</b>
        </div>
        <div className="signatureBox">
          <strong>{(metadata.approvalTitle || 'NGƯỜI PHÊ DUYỆT').toUpperCase()}</strong>
          <span>Ký, ghi rõ họ tên</span>
          <div className="signatureSpace" />
          <b>{metadata.approvedBy || 'Chưa ghi tên'}</b>
        </div>
      </section>

      <footer className="reportFooter">
        <span>{reportCode} · Phiên bản {metadata.version || '1.0'}</span>
        <span>HTL HỒ SƠ CHUẨN</span>
      </footer>

      <style jsx>{`
        .reportFields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 18px; }
        .reportFields label, .reportNote { display: grid; gap: 7px; font-weight: 700; }
        .reportFields input, .reportNote textarea { width: 100%; }
        .reportNote { margin-top: 14px; }
        .reportIdentity { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid currentColor; }
        .reportBrand { font-size: 1.2rem; font-weight: 900; letter-spacing: .04em; }
        .reportMetaBox { min-width: 270px; border: 1px solid rgba(120,120,120,.35); }
        .reportMetaBox div { display: grid; grid-template-columns: 110px 1fr; border-bottom: 1px solid rgba(120,120,120,.25); }
        .reportMetaBox div:last-child { border-bottom: 0; }
        .reportMetaBox strong, .reportMetaBox span { padding: 8px 10px; }
        .reportMetaBox strong { border-right: 1px solid rgba(120,120,120,.25); }
        .reportTitle { text-align: center; padding: 46px 0 34px; }
        .reportTitle h1 { margin-bottom: 8px; }
        .signatureSection { display: grid; grid-template-columns: 1fr 1fr; gap: 70px; text-align: center; }
        .signatureBox { display: grid; gap: 6px; }
        .signatureBox span { font-size: .9rem; opacity: .75; }
        .signatureSpace { min-height: 90px; }
        .reportFooter { display: flex; justify-content: space-between; gap: 20px; padding: 12px 4px 30px; font-size: .8rem; opacity: .7; }
        @media (max-width: 720px) {
          .reportFields { grid-template-columns: 1fr; }
          .reportIdentity { display: grid; }
          .reportMetaBox { min-width: 0; width: 100%; }
          .signatureSection { grid-template-columns: 1fr; }
        }
        @media print {
          :global(body) { background: white !important; color: #111 !important; }
          :global(.noPrint) { display: none !important; }
          .reportPage { max-width: none; padding: 0; }
          :global(.reportPage .panel) { box-shadow: none !important; border: 0 !important; border-radius: 0 !important; margin: 0 0 14px !important; padding: 18px 0 !important; background: white !important; color: #111 !important; }
          .reportCover { min-height: 245mm; page-break-after: always; }
          .reportSection { break-inside: avoid; }
          .reportItem { break-inside: avoid; }
          .signatureSection { page-break-inside: avoid; margin-top: 30px !important; }
          .reportFooter { color: #111; border-top: 1px solid #aaa; }
          :global(.badge), :global(.score), :global(.finding), :global(.emptyState) { box-shadow: none !important; }
          @page { size: A4; margin: 16mm 15mm 18mm; }
        }
      `}</style>
    </main>
  );
}
