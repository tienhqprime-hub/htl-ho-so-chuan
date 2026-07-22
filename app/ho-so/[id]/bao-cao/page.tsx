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

export default function DossierReportPage() {
  const params = useParams<{ id: string }>();
  const dossierId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [checklist, setChecklist] = useState<DossierChecklistItem[]>([]);
  const [history, setHistory] = useState<VerificationHistoryItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDossier(readDossiers().find((item) => item.id === dossierId) || null);
    setChecklist(readDossierChecklist(dossierId));
    setHistory(readDossierVerificationHistory(dossierId));
    setReady(true);
  }, [dossierId]);

  const completion = useMemo(() => evaluateDossierCompletion(checklist), [checklist]);
  const latest = history[0];
  const latestChecks = latest?.crossChecks || [];
  const inconsistentChecks = latestChecks.filter((item) => item.status === 'KHÔNG THỐNG NHẤT');
  const insufficientChecks = latestChecks.filter((item) => item.status === 'CHƯA ĐỦ DỮ LIỆU');
  const generatedAt = useMemo(() => new Date().toLocaleString('vi-VN'), []);

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
    <main className="shell narrow">
      <header className="topbar noPrint">
        <Link className="brand" href="/">HTL HỒ SƠ CHUẨN</Link>
        <div className="actions">
          <Link className="primary secondary" href={`/ho-so/${encodeURIComponent(dossier.id)}`}>Trở về hồ sơ</Link>
          <button className="primary" onClick={() => window.print()}>In hoặc lưu PDF</button>
        </div>
      </header>

      <section className="panel result">
        <div className="eyebrow">BÁO CÁO HỒ SƠ CHUẨN</div>
        <h1>{dossier.name}</h1>
        <p className="leadResult">{dossier.company}</p>
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

      <section className="panel">
        <div className="resultHead">
          <div>
            <div className="eyebrow">KẾT LUẬN TỔNG THỂ</div>
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

      <section className="panel">
        <div className="eyebrow">DANH MỤC TÀI LIỆU</div>
        <h2>Checklist hồ sơ</h2>
        <div className="historyList">
          {checklist.map((item) => (
            <article className="finding" key={item.id}>
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

      <section className="panel">
        <div className="eyebrow">KẾT QUẢ KIỂM TRA GẦN NHẤT</div>
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
        <section className="panel">
          <div className="eyebrow">ĐỐI CHIẾU CHÉO</div>
          <h2>{inconsistentChecks.length ? `${inconsistentChecks.length} trường không thống nhất` : 'Chưa phát hiện trường không thống nhất'}</h2>
          <div className="twoCols">
            <div><h3>Cần ưu tiên xác minh</h3><p>{inconsistentChecks.length} trường không thống nhất.</p></div>
            <div><h3>Còn thiếu căn cứ</h3><p>{insufficientChecks.length} trường chưa đủ dữ liệu.</p></div>
          </div>
          <div className="historyList">
            {latestChecks.map((check, index) => (
              <article className="finding" key={`${check.field}-${index}`}>
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

      <section className="panel">
        <div className="eyebrow">PHẠM VI VÀ GIỚI HẠN</div>
        <p>Báo cáo được tổng hợp từ dữ liệu và tài liệu người dùng đã cung cấp tại các lần kiểm tra được lưu trên trình duyệt hiện tại.</p>
        <p className="muted">Báo cáo hỗ trợ rà soát và ra quyết định nội bộ; không thay thế giám định, công chứng, xác nhận của cơ quan cấp phát hoặc tư vấn pháp lý chuyên môn.</p>
      </section>
    </main>
  );
}
