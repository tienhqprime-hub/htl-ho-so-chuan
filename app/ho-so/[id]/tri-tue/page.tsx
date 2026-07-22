'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Dossier,
  DossierChecklistItem,
  VerificationHistoryItem,
  ensureDossierChecklist,
  readDossiers,
  readDossierVerificationHistory,
} from '../../../../lib/dossier-storage';
import { DossierWorkflow, readDossierWorkflow } from '../../../../lib/dossier-workflow';
import {
  DossierIntelligenceReport,
  IntelligenceRiskLevel,
  IntelligenceSignal,
  evaluateDossierIntelligence,
} from '../../../../lib/dossier-intelligence';

function riskTone(level: IntelligenceRiskLevel) {
  if (level === 'NGHIÊM TRỌNG' || level === 'CAO') return 'cao';
  if (level === 'TRUNG BÌNH') return 'trung-bình';
  return 'thông-tin';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function SignalCard({ signal, index }: { signal: IntelligenceSignal; index: number }) {
  return (
    <article className="finding signalCard">
      <div className="resultHead">
        <div>
          <small>ƯU TIÊN {index + 1}</small>
          <h3>{signal.title}</h3>
        </div>
        <span className={`badge ${riskTone(signal.level)}`}>{signal.level} · {signal.score} ĐIỂM</span>
      </div>
      <p>{signal.description}</p>
      <div className="signalGrid">
        <div><strong>Ảnh hưởng</strong><p>{signal.impact}</p></div>
        <div><strong>Hành động đề xuất</strong><p>{signal.recommendation}</p></div>
      </div>
      {!!signal.evidence.length && (
        <details>
          <summary>Bằng chứng liên quan ({signal.evidence.length})</summary>
          <ul>{signal.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
        </details>
      )}
    </article>
  );
}

export default function DossierIntelligencePage() {
  const params = useParams<{ id: string }>();
  const dossierId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [checklist, setChecklist] = useState<DossierChecklistItem[]>([]);
  const [history, setHistory] = useState<VerificationHistoryItem[]>([]);
  const [workflow, setWorkflow] = useState<DossierWorkflow | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const selected = readDossiers().find((item) => item.id === dossierId) || null;
    setDossier(selected);
    setChecklist(ensureDossierChecklist(dossierId, selected?.category || ''));
    setHistory(readDossierVerificationHistory(dossierId));
    setWorkflow(readDossierWorkflow(dossierId));
    setReady(true);
  }, [dossierId]);

  const report = useMemo<DossierIntelligenceReport | null>(() => {
    if (!dossier || !workflow) return null;
    return evaluateDossierIntelligence({ dossier, checklist, verificationHistory: history, workflow });
  }, [checklist, dossier, history, workflow]);

  if (!ready) {
    return <main className="shell"><section className="panel"><p>Đang tổng hợp dữ liệu phân tích…</p></section></main>;
  }

  if (!dossier || !report || !workflow) {
    return (
      <main className="shell narrow">
        <section className="panel">
          <div className="eyebrow">KHÔNG TÌM THẤY HỒ SƠ</div>
          <h1>Chưa thể tạo báo cáo trí tuệ cho hồ sơ này.</h1>
          <p className="muted">Hãy kiểm tra lại dữ liệu trên trình duyệt hiện tại.</p>
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
          <div className="tagline">Executive Decision Dashboard</div>
        </div>
        <div className="actions">
          <Link className="primary secondary" href={`/ho-so/${encodeURIComponent(dossier.id)}`}>Chi tiết hồ sơ</Link>
          <Link className="primary secondary" href={`/ho-so/${encodeURIComponent(dossier.id)}/quy-trinh`}>Quy trình</Link>
          <Link className="primary secondary" href={`/ho-so/${encodeURIComponent(dossier.id)}/bao-cao`}>Báo cáo chuẩn</Link>
        </div>
      </header>

      <section className="panel decisionHero">
        <div>
          <div className="eyebrow">HTL INTELLIGENCE REPORT</div>
          <h1>{dossier.code} · {dossier.name}</h1>
          <p className="leadResult muted">{dossier.company} · {dossier.category || 'Chưa phân loại'} · Phụ trách: {dossier.owner || 'Chưa phân công'}</p>
          <p className="generated">Tổng hợp lúc {formatDate(report.generatedAt)} · Độ tin cậy phân tích {report.confidence}%</p>
        </div>
        <div className="decisionStatus">
          <span>KẾT LUẬN ĐIỀU HÀNH</span>
          <strong>{report.readinessLevel}</strong>
          <small>Rủi ro {report.riskLevel.toLowerCase()}</small>
        </div>
      </section>

      <section className="scoreGrid">
        <article className="scoreCard primaryScore">
          <span>Điểm sẵn sàng</span><strong>{report.readinessScore}</strong><small>/100</small>
          <div className="scoreTrack"><i style={{ width: `${report.readinessScore}%` }} /></div>
        </article>
        <article className="scoreCard">
          <span>Điểm rủi ro</span><strong>{report.riskScore}</strong><small>/100</small>
          <div className="scoreTrack"><i style={{ width: `${report.riskScore}%` }} /></div>
        </article>
        <article className="scoreCard">
          <span>Hoàn thiện checklist</span><strong>{report.completionPercentage}%</strong><small>Tài liệu bắt buộc</small>
          <div className="scoreTrack"><i style={{ width: `${report.completionPercentage}%` }} /></div>
        </article>
        <article className="scoreCard">
          <span>Tiến độ workflow</span><strong>{report.workflowProgress}%</strong><small>{workflow.stage}</small>
          <div className="scoreTrack"><i style={{ width: `${report.workflowProgress}%` }} /></div>
        </article>
      </section>

      <section className="panel executiveConclusion">
        <div className="resultHead">
          <div>
            <div className="eyebrow">QUYẾT ĐỊNH ĐỀ XUẤT</div>
            <h2>{report.conclusion}</h2>
          </div>
          <span className={`badge ${riskTone(report.riskLevel)}`}>RỦI RO {report.riskLevel}</span>
        </div>
        <div className="nextAction">
          <span>HÀNH ĐỘNG CẦN ƯU TIÊN</span>
          <strong>{report.recommendedNextAction}</strong>
        </div>
        <p className="muted">Đây là đánh giá hỗ trợ điều hành từ dữ liệu đang lưu, không phải kết luận pháp lý, xác nhận tính xác thực hoặc quyết định phê duyệt tự động.</p>
      </section>

      <section className="summaryGrid">
        <article className="panel summaryCard blockerSummary">
          <span>ĐIỂM CHẶN</span><strong>{report.blockers.length}</strong>
          <p>{report.blockers.length ? 'Cần xử lý trước khi tiếp tục hoặc trình duyệt.' : 'Chưa ghi nhận điểm chặn trực tiếp.'}</p>
        </article>
        <article className="panel summaryCard warningSummary">
          <span>CẢNH BÁO</span><strong>{report.warnings.length}</strong>
          <p>{report.warnings.length ? 'Cần xác nhận hoặc theo dõi trong quá trình xử lý.' : 'Chưa ghi nhận cảnh báo đáng kể.'}</p>
        </article>
        <article className="panel summaryCard strengthSummary">
          <span>ĐIỂM MẠNH</span><strong>{report.strengths.length}</strong>
          <p>Các tín hiệu tích cực đang hỗ trợ mức độ sẵn sàng.</p>
        </article>
        <article className="panel summaryCard gapSummary">
          <span>KHOẢNG TRỐNG BẰNG CHỨNG</span><strong>{report.evidenceGaps.length}</strong>
          <p>Các nội dung còn cần bổ sung hoặc xác minh.</p>
        </article>
      </section>

      {!!report.blockers.length && (
        <section className="panel">
          <div className="resultHead">
            <div><div className="eyebrow">ĐIỂM CHẶN QUYẾT ĐỊNH</div><h2>Cần xử lý trước khi tiếp tục</h2></div>
            <span className="badge cao">{report.blockers.length} ĐIỂM CHẶN</span>
          </div>
          <div className="signalList">{report.blockers.map((signal, index) => <SignalCard key={signal.id} signal={signal} index={index} />)}</div>
        </section>
      )}

      {!!report.warnings.length && (
        <section className="panel">
          <div className="resultHead">
            <div><div className="eyebrow">CẢNH BÁO ĐIỀU HÀNH</div><h2>Những nội dung cần theo dõi</h2></div>
            <span className="badge trung-bình">{report.warnings.length} CẢNH BÁO</span>
          </div>
          <div className="signalList">{report.warnings.map((signal, index) => <SignalCard key={signal.id} signal={signal} index={index} />)}</div>
        </section>
      )}

      <section className="twoCols executiveLists">
        <article className="panel">
          <div className="eyebrow">ĐIỂM MẠNH ĐANG CÓ</div>
          <h2>Căn cứ tích cực</h2>
          {report.strengths.length ? <ul>{report.strengths.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted">Chưa có đủ dữ liệu để ghi nhận điểm mạnh nổi bật.</p>}
        </article>
        <article className="panel">
          <div className="eyebrow">KHOẢNG TRỐNG BẰNG CHỨNG</div>
          <h2>Cần bổ sung hoặc xác minh</h2>
          {report.evidenceGaps.length ? <ul>{report.evidenceGaps.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Không ghi nhận khoảng trống bằng chứng từ dữ liệu hiện tại.</p>}
        </article>
      </section>

      <section className="panel">
        <div className="finding">
          <h3>Nguyên tắc ra quyết định</h3>
          <p>Điểm số chỉ giúp sắp xếp sự chú ý. Người có thẩm quyền cần đọc tài liệu nguồn, kiểm tra bằng chứng đối chiếu, xác nhận phiên bản và đánh giá yêu cầu thực tế trước khi chấp thuận, nộp hoặc đóng hồ sơ.</p>
        </div>
        <div className="actions">
          <Link className="primary" href={`/ho-so/${encodeURIComponent(dossier.id)}/quy-trinh`}>Cập nhật việc cần làm</Link>
          <Link className="primary secondary" href={`/kiem-tra?dossierId=${encodeURIComponent(dossier.id)}&code=${encodeURIComponent(dossier.code)}&name=${encodeURIComponent(dossier.name)}&company=${encodeURIComponent(dossier.company)}`}>Kiểm tra thêm tài liệu</Link>
          <Link className="primary secondary" href="/trung-tam-tri-thuc">Tra cứu Trung tâm Tri thức</Link>
        </div>
      </section>

      <style jsx>{`
        .decisionHero { display: flex; justify-content: space-between; gap: 28px; align-items: center; }
        .generated { opacity: .65; font-size: .9rem; }
        .decisionStatus { min-width: 260px; padding: 24px; border-radius: 20px; border: 2px solid rgba(120,120,120,.28); text-align: center; }
        .decisionStatus span, .decisionStatus strong, .decisionStatus small { display: block; }
        .decisionStatus strong { margin: 10px 0; font-size: 1.45rem; }
        .scoreGrid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 14px; margin: 18px 0; }
        .scoreCard { padding: 20px; border: 1px solid rgba(120,120,120,.22); border-radius: 18px; }
        .scoreCard span, .scoreCard small { display: block; }
        .scoreCard strong { font-size: 2.6rem; line-height: 1; margin: 10px 0 4px; display: inline-block; }
        .scoreCard small { opacity: .7; }
        .scoreTrack { height: 8px; background: rgba(120,120,120,.18); border-radius: 999px; overflow: hidden; margin-top: 16px; }
        .scoreTrack i { display: block; height: 100%; background: currentColor; }
        .primaryScore { border-width: 2px; }
        .executiveConclusion h2 { max-width: 900px; }
        .nextAction { margin: 18px 0; padding: 20px; border-radius: 16px; background: rgba(120,120,120,.08); }
        .nextAction span, .nextAction strong { display: block; }
        .nextAction span { font-size: .76rem; letter-spacing: .08em; font-weight: 800; opacity: .72; }
        .nextAction strong { margin-top: 8px; font-size: 1.12rem; }
        .summaryGrid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 14px; }
        .summaryCard span, .summaryCard strong { display: block; }
        .summaryCard span { font-size: .76rem; font-weight: 800; letter-spacing: .08em; }
        .summaryCard strong { font-size: 2.4rem; margin: 8px 0; }
        .signalList { display: grid; gap: 14px; }
        .signalGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 14px; }
        .signalGrid p { margin-bottom: 0; }
        details { margin-top: 14px; }
        summary { cursor: pointer; font-weight: 700; }
        .executiveLists { align-items: stretch; }
        @media (max-width: 1000px) {
          .scoreGrid, .summaryGrid { grid-template-columns: repeat(2,minmax(0,1fr)); }
          .decisionHero { align-items: stretch; flex-direction: column; }
        }
        @media (max-width: 640px) {
          .scoreGrid, .summaryGrid, .signalGrid { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
