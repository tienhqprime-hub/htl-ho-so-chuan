'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Dossier,
  VerificationHistoryItem,
  readDossiers,
  readDossierVerificationHistory,
} from '../../../lib/dossier-storage';

export default function DossierDetailPage() {
  const params = useParams<{ id: string }>();
  const dossierId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [history, setHistory] = useState<VerificationHistoryItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const selected = readDossiers().find((item) => item.id === dossierId) || null;
    setDossier(selected);
    setHistory(readDossierVerificationHistory(dossierId));
    setReady(true);
  }, [dossierId]);

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
            <p><strong>Mức độ tự tin gần nhất:</strong> {history[0] ? `${history[0].confidence}%` : 'Chưa có dữ liệu'}</p>
          </div>
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

        {!history.length && (
          <div className="emptyState">
            Hồ sơ chưa có kết quả kiểm tra. Hãy bắt đầu bằng việc tải tài liệu lên để HTL rà soát.
          </div>
        )}

        <div className="historyList">
          {history.map((entry, index) => (
            <article className="finding" key={entry.id}>
              <div className="resultHead">
                <div>
                  <small>Lần kiểm tra {history.length - index} · {entry.createdAt}</small>
                  <h3>{entry.status}</h3>
                </div>
                <div className="score"><strong>{entry.confidence}%</strong><span>Mức độ tự tin</span></div>
              </div>
              <p className="leadResult">{entry.summary}</p>
              <p><strong>Tài liệu:</strong> {entry.fileNames.join(', ') || 'Không có tên tệp'}</p>
              <p><strong>Nội dung cần làm rõ:</strong> {entry.context || 'Không ghi thêm yêu cầu'}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="eyebrow">CHECKLIST HỒ SƠ CHUẨN</div>
        <h2>Sắp được bổ sung</h2>
        <p className="muted">Khu vực này sẽ dùng để theo dõi tài liệu bắt buộc, tài liệu đã có, tài liệu còn thiếu và việc cần bổ sung. Em giữ đúng vị trí trong cấu trúc nhưng chưa triển khai logic khi chưa hoàn thiện trang chi tiết.</p>
      </section>
    </main>
  );
}
