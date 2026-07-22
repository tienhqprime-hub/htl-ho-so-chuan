'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { evaluateDossierCompletion } from '../../lib/dossier-completion';
import { buildDossierVersions } from '../../lib/dossier-versioning';
import {
  Dossier,
  DossierChecklistItem,
  VerificationHistoryItem,
  readChecklist,
  readDossiers,
  readVerificationHistory,
} from '../../lib/dossier-storage';

type DossierOverview = {
  dossier: Dossier;
  completion: ReturnType<typeof evaluateDossierCompletion>;
  latestVerification?: VerificationHistoryItem;
  importantChanges: number;
  inconsistentFields: number;
  priorityScore: number;
  priorityReason: string;
};

const statusOrder = ['Chờ bổ sung', 'Đang kiểm tra', 'Mới tiếp nhận', 'Hoàn thành', 'Đã đóng'];

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export default function DashboardPage() {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [checklist, setChecklist] = useState<DossierChecklistItem[]>([]);
  const [history, setHistory] = useState<VerificationHistoryItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDossiers(readDossiers());
    setChecklist(readChecklist());
    setHistory(readVerificationHistory());
    setReady(true);
  }, []);

  const overview = useMemo<DossierOverview[]>(() => dossiers.map((dossier) => {
    const dossierChecklist = checklist.filter((item) => item.dossierId === dossier.id);
    const dossierHistory = history.filter((item) => item.dossierId === dossier.id);
    const completion = evaluateDossierCompletion(dossierChecklist);
    const versions = buildDossierVersions(dossierHistory);
    const latestVerification = dossierHistory[0];
    const importantChanges = versions[0]?.changes.filter((change) => change.significance === 'cao').length || 0;
    const inconsistentFields = latestVerification?.crossChecks?.filter((item) => item.status === 'KHÔNG THỐNG NHẤT').length || 0;
    const missingRequired = completion.missingRequired.length + completion.needsSupplementRequired.length;

    let priorityScore = 0;
    const reasons: string[] = [];
    if (dossier.status === 'Chờ bổ sung') {
      priorityScore += 40;
      reasons.push('đang chờ bổ sung');
    }
    if (missingRequired > 0) {
      priorityScore += Math.min(30, missingRequired * 8);
      reasons.push(`${missingRequired} mục bắt buộc chưa đạt`);
    }
    if (inconsistentFields > 0) {
      priorityScore += Math.min(30, inconsistentFields * 10);
      reasons.push(`${inconsistentFields} trường chưa thống nhất`);
    }
    if (importantChanges > 0) {
      priorityScore += Math.min(20, importantChanges * 8);
      reasons.push(`${importantChanges} thay đổi quan trọng`);
    }
    if (!latestVerification) {
      priorityScore += 15;
      reasons.push('chưa được kiểm tra');
    }

    return {
      dossier,
      completion,
      latestVerification,
      importantChanges,
      inconsistentFields,
      priorityScore,
      priorityReason: reasons.join(' · ') || 'chưa có cảnh báo ưu tiên',
    };
  }), [dossiers, checklist, history]);

  const metrics = useMemo(() => {
    const total = overview.length;
    const averageCompletion = total
      ? overview.reduce((sum, item) => sum + item.completion.percentage, 0) / total
      : 0;
    const needsAction = overview.filter((item) => item.priorityScore > 0 && item.dossier.status !== 'Hoàn thành' && item.dossier.status !== 'Đã đóng').length;
    const inconsistent = overview.filter((item) => item.inconsistentFields > 0).length;
    const completed = overview.filter((item) => item.dossier.status === 'Hoàn thành' || item.dossier.status === 'Đã đóng').length;

    return { total, averageCompletion, needsAction, inconsistent, completed };
  }, [overview]);

  const statusCounts = useMemo(() => statusOrder.map((status) => ({
    status,
    count: dossiers.filter((item) => item.status === status).length,
  })), [dossiers]);

  const priorityDossiers = useMemo(() => [...overview]
    .filter((item) => item.dossier.status !== 'Hoàn thành' && item.dossier.status !== 'Đã đóng')
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 8), [overview]);

  const ownerStats = useMemo(() => {
    const grouped = new Map<string, { total: number; completion: number; needsAction: number }>();
    overview.forEach((item) => {
      const owner = item.dossier.owner || 'Chưa phân công';
      const current = grouped.get(owner) || { total: 0, completion: 0, needsAction: 0 };
      current.total += 1;
      current.completion += item.completion.percentage;
      if (item.priorityScore > 0) current.needsAction += 1;
      grouped.set(owner, current);
    });
    return Array.from(grouped.entries())
      .map(([owner, value]) => ({ ...value, owner, average: value.total ? value.completion / value.total : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [overview]);

  if (!ready) {
    return <main className="shell"><section className="panel"><p>Đang tổng hợp dữ liệu quản trị…</p></section></main>;
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <Link className="brand" href="/">HTL HỒ SƠ CHUẨN</Link>
          <div className="tagline">Dashboard quản trị hồ sơ doanh nghiệp</div>
        </div>
        <div className="actions">
          <Link className="primary secondary" href="/ho-so">Danh sách hồ sơ</Link>
          <Link className="primary" href="/kiem-tra">Kiểm tra tài liệu</Link>
        </div>
      </header>

      <section className="panel dashboardHero">
        <div>
          <div className="eyebrow">TỔNG QUAN ĐIỀU HÀNH</div>
          <h1>Nhìn toàn bộ hồ sơ trên một màn hình</h1>
          <p className="leadResult muted">Ưu tiên các hồ sơ thiếu tài liệu bắt buộc, có thông tin chưa thống nhất hoặc vừa phát sinh thay đổi quan trọng.</p>
        </div>
        <div className="heroDecision">
          <strong>{metrics.needsAction}</strong>
          <span>hồ sơ cần xử lý</span>
        </div>
      </section>

      <section className="metricGrid">
        <article className="metricCard"><span>Tổng hồ sơ</span><strong>{metrics.total}</strong><small>Toàn bộ hồ sơ đang lưu</small></article>
        <article className="metricCard"><span>Hoàn thiện trung bình</span><strong>{formatPercent(metrics.averageCompletion)}</strong><small>Theo checklist hiện tại</small></article>
        <article className="metricCard"><span>Cần hành động</span><strong>{metrics.needsAction}</strong><small>Thiếu, mâu thuẫn hoặc chưa kiểm tra</small></article>
        <article className="metricCard"><span>Có đối chiếu chưa thống nhất</span><strong>{metrics.inconsistent}</strong><small>Cần kiểm tra bằng chứng</small></article>
        <article className="metricCard"><span>Hoàn thành hoặc đã đóng</span><strong>{metrics.completed}</strong><small>Không nằm trong danh sách ưu tiên</small></article>
      </section>

      <section className="panel">
        <div className="resultHead">
          <div>
            <div className="eyebrow">PHÂN BỐ TRẠNG THÁI</div>
            <h2>Hồ sơ đang ở đâu trong quy trình?</h2>
          </div>
        </div>
        <div className="statusGrid">
          {statusCounts.map((item) => (
            <article className="statusCard" key={item.status}>
              <strong>{item.count}</strong>
              <span>{item.status}</span>
              <div className="statusBar"><i style={{ width: `${metrics.total ? (item.count / metrics.total) * 100 : 0}%` }} /></div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="resultHead">
          <div>
            <div className="eyebrow">DANH SÁCH ƯU TIÊN</div>
            <h2>Hồ sơ nên được xử lý trước</h2>
            <p className="muted">Thứ tự được tính từ trạng thái chờ bổ sung, tài liệu bắt buộc chưa đạt, đối chiếu chưa thống nhất, thay đổi quan trọng và việc chưa có lần kiểm tra.</p>
          </div>
        </div>

        {!priorityDossiers.length ? (
          <div className="emptyState">Chưa có hồ sơ đang xử lý. Hãy tạo hồ sơ hoặc mở danh sách hiện có.</div>
        ) : (
          <div className="priorityTable">
            <div className="priorityRow priorityHeader">
              <span>Hồ sơ</span><span>Hoàn thiện</span><span>Cảnh báo</span><span>Ưu tiên</span><span></span>
            </div>
            {priorityDossiers.map((item) => (
              <div className="priorityRow" key={item.dossier.id}>
                <div><strong>{item.dossier.code}</strong><small>{item.dossier.name}</small><small>{item.dossier.company}</small></div>
                <div><strong>{item.completion.percentage}%</strong><small>{item.completion.level}</small></div>
                <div><span>{item.priorityReason}</span></div>
                <div><span className={`badge ${item.priorityScore >= 60 ? 'cao' : item.priorityScore >= 30 ? 'trung-bình' : 'thông-tin'}`}>{item.priorityScore} điểm</span></div>
                <div><Link className="primary secondary" href={`/ho-so/${encodeURIComponent(item.dossier.id)}`}>Mở hồ sơ</Link></div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="resultHead">
          <div>
            <div className="eyebrow">THEO NGƯỜI PHỤ TRÁCH</div>
            <h2>Khối lượng và chất lượng xử lý</h2>
          </div>
        </div>
        {!ownerStats.length ? (
          <div className="emptyState">Chưa có dữ liệu người phụ trách.</div>
        ) : (
          <div className="ownerGrid">
            {ownerStats.map((item) => (
              <article className="finding" key={item.owner}>
                <h3>{item.owner}</h3>
                <p><strong>{item.total}</strong> hồ sơ · <strong>{formatPercent(item.average)}</strong> hoàn thiện trung bình</p>
                <p><strong>{item.needsAction}</strong> hồ sơ đang có cảnh báo cần xử lý.</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="finding">
          <h3>Kết luận điều hành</h3>
          <p>{metrics.needsAction > 0
            ? `Hiện có ${metrics.needsAction} hồ sơ cần được xem xét. Nên bắt đầu từ danh sách ưu tiên và kiểm tra trực tiếp bằng chứng của các trường chưa thống nhất trước khi ra quyết định.`
            : 'Hiện chưa ghi nhận hồ sơ đang xử lý có cảnh báo ưu tiên. Tiếp tục cập nhật checklist và thực hiện kiểm tra lại khi có tài liệu mới.'}</p>
          <p className="muted">Dashboard phản ánh dữ liệu đang lưu trên trình duyệt hiện tại. Điểm ưu tiên là công cụ sắp xếp công việc, không phải kết luận pháp lý hay kết luận về tính hợp lệ của hồ sơ.</p>
        </div>
      </section>

      <style jsx>{`
        .dashboardHero { display: flex; justify-content: space-between; gap: 28px; align-items: center; }
        .heroDecision { min-width: 180px; padding: 22px; border: 1px solid rgba(120,120,120,.25); border-radius: 18px; text-align: center; }
        .heroDecision strong { display: block; font-size: 3rem; line-height: 1; }
        .heroDecision span { display: block; margin-top: 8px; }
        .metricGrid { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 14px; margin: 18px 0; }
        .metricCard { padding: 20px; border: 1px solid rgba(120,120,120,.22); border-radius: 18px; background: rgba(255,255,255,.03); }
        .metricCard span, .metricCard small { display: block; }
        .metricCard strong { display: block; font-size: 2rem; margin: 8px 0; }
        .metricCard small { opacity: .72; }
        .statusGrid { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 14px; }
        .statusCard { padding: 18px; border: 1px solid rgba(120,120,120,.22); border-radius: 16px; }
        .statusCard strong { display: block; font-size: 1.8rem; }
        .statusCard span { display: block; min-height: 42px; margin-top: 6px; }
        .statusBar { height: 8px; margin-top: 12px; border-radius: 999px; background: rgba(120,120,120,.18); overflow: hidden; }
        .statusBar i { display: block; height: 100%; background: currentColor; border-radius: inherit; }
        .priorityTable { display: grid; gap: 8px; }
        .priorityRow { display: grid; grid-template-columns: 1.3fr .65fr 1.5fr .55fr auto; gap: 14px; align-items: center; padding: 14px; border: 1px solid rgba(120,120,120,.2); border-radius: 14px; }
        .priorityRow div small { display: block; margin-top: 4px; opacity: .72; }
        .priorityHeader { font-size: .78rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; border: 0; padding-top: 0; }
        .ownerGrid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 14px; }
        @media (max-width: 1000px) {
          .metricGrid, .statusGrid { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .ownerGrid { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .priorityHeader { display: none; }
          .priorityRow { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 640px) {
          .dashboardHero { align-items: stretch; flex-direction: column; }
          .metricGrid, .statusGrid, .ownerGrid { grid-template-columns: 1fr; }
          .priorityRow { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
