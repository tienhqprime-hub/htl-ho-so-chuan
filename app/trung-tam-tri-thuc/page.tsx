'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  DOSSIER_KNOWLEDGE_GUIDES,
  KnowledgeGuide,
  getKnowledgeTemplateName,
  getKnowledgeTemplateOptions,
} from '../../lib/dossier-knowledge';
import { normalizeRuleText } from '../../lib/dossier-rules';

const riskOrder: Record<KnowledgeGuide['risk'], number> = {
  Cao: 3,
  'Trung bình': 2,
  Thấp: 1,
};

function riskTone(risk: KnowledgeGuide['risk']) {
  if (risk === 'Cao') return 'cao';
  if (risk === 'Trung bình') return 'trung-bình';
  return 'thông-tin';
}

export default function KnowledgeCenterPage() {
  const templateOptions = getKnowledgeTemplateOptions();
  const [templateId, setTemplateId] = useState('Tất cả');
  const [risk, setRisk] = useState<'Tất cả' | KnowledgeGuide['risk']>('Tất cả');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(DOSSIER_KNOWLEDGE_GUIDES[0]?.id || '');

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeRuleText(query);
    return DOSSIER_KNOWLEDGE_GUIDES
      .filter((guide) => templateId === 'Tất cả' || guide.templateId === templateId)
      .filter((guide) => risk === 'Tất cả' || guide.risk === risk)
      .filter((guide) => {
        if (!normalizedQuery) return true;
        const text = normalizeRuleText([
          guide.title,
          guide.question,
          guide.explanation,
          guide.impact,
          guide.recommendation,
          ...guide.evidenceNeeded,
          getKnowledgeTemplateName(guide.templateId),
        ].join(' '));
        return text.includes(normalizedQuery);
      })
      .sort((a, b) => riskOrder[b.risk] - riskOrder[a.risk] || a.title.localeCompare(b.title, 'vi'));
  }, [query, risk, templateId]);

  const selected = DOSSIER_KNOWLEDGE_GUIDES.find((guide) => guide.id === selectedId)
    || filtered[0]
    || DOSSIER_KNOWLEDGE_GUIDES[0];

  const metrics = useMemo(() => ({
    total: filtered.length,
    highRisk: filtered.filter((guide) => guide.risk === 'Cao').length,
    templates: new Set(filtered.map((guide) => guide.templateId)).size,
    averageConfidence: filtered.length
      ? Math.round(filtered.reduce((sum, guide) => sum + guide.confidence, 0) / filtered.length)
      : 0,
  }), [filtered]);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <Link className="brand" href="/">HTL HỒ SƠ CHUẨN</Link>
          <div className="tagline">Trung tâm tri thức nghiệp vụ</div>
        </div>
        <div className="actions">
          <Link className="primary secondary" href="/kho-ho-so-chuan">Kho Hồ Sơ Chuẩn</Link>
          <Link className="primary secondary" href="/dashboard">Dashboard</Link>
        </div>
      </header>

      <section className="panel knowledgeHero">
        <div>
          <div className="eyebrow">AI KNOWLEDGE CENTER</div>
          <h1>Hiểu vì sao cần tài liệu, thiếu thì ảnh hưởng gì và nên xử lý thế nào</h1>
          <p className="leadResult muted">Trung tâm này chuyển checklist thành hướng dẫn nghiệp vụ có cấu trúc, giúp người dùng biết cần xem bằng chứng nào trước khi ra quyết định.</p>
        </div>
        <div className="heroMetric">
          <strong>{metrics.total}</strong>
          <span>hướng dẫn phù hợp</span>
        </div>
      </section>

      <section className="metricGrid">
        <article className="metricCard"><span>Hướng dẫn đang hiển thị</span><strong>{metrics.total}</strong><small>Theo bộ lọc hiện tại</small></article>
        <article className="metricCard"><span>Rủi ro cao</span><strong>{metrics.highRisk}</strong><small>Nên ưu tiên xem trước</small></article>
        <article className="metricCard"><span>Nhóm hồ sơ</span><strong>{metrics.templates}</strong><small>Có nội dung phù hợp</small></article>
        <article className="metricCard"><span>Độ tin cậy trung bình</span><strong>{metrics.averageConfidence}%</strong><small>Của hướng dẫn nghiệp vụ</small></article>
      </section>

      <section className="panel">
        <div className="knowledgeToolbar">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tài liệu, rủi ro, ảnh hưởng hoặc bằng chứng..." />
          <select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
            <option value="Tất cả">Tất cả loại hồ sơ</option>
            {templateOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
          <select value={risk} onChange={(event) => setRisk(event.target.value as typeof risk)}>
            <option>Tất cả</option>
            <option>Cao</option>
            <option>Trung bình</option>
            <option>Thấp</option>
          </select>
        </div>

        <div className="knowledgeLayout">
          <div className="guideList">
            {!filtered.length && <div className="emptyState">Không tìm thấy hướng dẫn phù hợp.</div>}
            {filtered.map((guide) => (
              <button
                className={`guideCard ${selected?.id === guide.id ? 'active' : ''}`}
                key={guide.id}
                type="button"
                onClick={() => setSelectedId(guide.id)}
              >
                <div className="guideCardHead">
                  <span className={`badge ${riskTone(guide.risk)}`}>{guide.risk}</span>
                  <small>{guide.confidence}% tin cậy</small>
                </div>
                <strong>{guide.title}</strong>
                <span>{getKnowledgeTemplateName(guide.templateId)}</span>
                <p>{guide.question}</p>
              </button>
            ))}
          </div>

          {selected && (
            <article className="knowledgeDetail">
              <div className="resultHead">
                <div>
                  <div className="eyebrow">HƯỚNG DẪN NGHIỆP VỤ</div>
                  <h2>{selected.title}</h2>
                  <p className="muted">{getKnowledgeTemplateName(selected.templateId)}</p>
                </div>
                <div className="score"><strong>{selected.confidence}%</strong><span>Độ tin cậy</span></div>
              </div>

              <section className="finding emphasis">
                <span className={`badge ${riskTone(selected.risk)}`}>RỦI RO {selected.risk.toUpperCase()}</span>
                <h3>{selected.question}</h3>
                <p>{selected.explanation}</p>
              </section>

              <div className="twoCols">
                <section className="finding">
                  <div className="eyebrow">ẢNH HƯỞNG NẾU THIẾU</div>
                  <h3>Điều gì cần lưu ý?</h3>
                  <p>{selected.impact}</p>
                </section>
                <section className="finding">
                  <div className="eyebrow">KHUYẾN NGHỊ XỬ LÝ</div>
                  <h3>Nên làm gì tiếp theo?</h3>
                  <p>{selected.recommendation}</p>
                </section>
              </div>

              <section className="finding">
                <div className="eyebrow">BẰNG CHỨNG CẦN KIỂM TRA</div>
                <h3>Không kết luận chỉ từ tên tài liệu</h3>
                <ul>{selected.evidenceNeeded.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>

              <div className="notice">
                <h3>Kết luận cho người sử dụng</h3>
                <p>Hướng dẫn này giúp xác định trọng tâm kiểm tra. Chỉ nên kết luận sau khi đối chiếu tài liệu thực tế, nguồn phát hành, phiên bản, người ký và mối liên hệ với toàn bộ hồ sơ.</p>
              </div>

              <div className="actions">
                <Link className="primary" href="/kiem-tra">Mở kiểm tra tài liệu</Link>
                <Link className="primary secondary" href="/kho-ho-so-chuan">Xem mẫu hồ sơ liên quan</Link>
              </div>
            </article>
          )}
        </div>
      </section>

      <style jsx>{`
        .knowledgeHero { display: flex; justify-content: space-between; gap: 28px; align-items: center; }
        .heroMetric { min-width: 190px; padding: 22px; border: 1px solid rgba(120,120,120,.24); border-radius: 18px; text-align: center; }
        .heroMetric strong, .heroMetric span { display: block; }
        .heroMetric strong { font-size: 3rem; line-height: 1; }
        .metricGrid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 14px; margin: 18px 0; }
        .metricCard { padding: 18px; border: 1px solid rgba(120,120,120,.22); border-radius: 16px; }
        .metricCard span, .metricCard small, .metricCard strong { display: block; }
        .metricCard strong { font-size: 2rem; margin: 8px 0; }
        .metricCard small { opacity: .72; }
        .knowledgeToolbar { display: grid; grid-template-columns: 1fr 270px 180px; gap: 12px; margin-bottom: 20px; }
        .knowledgeLayout { display: grid; grid-template-columns: minmax(290px,.85fr) minmax(0,1.65fr); gap: 20px; align-items: start; }
        .guideList { display: grid; gap: 10px; max-height: 900px; overflow-y: auto; padding-right: 4px; }
        .guideCard { display: grid; gap: 8px; padding: 16px; border-radius: 16px; border: 1px solid rgba(120,120,120,.22); background: transparent; color: inherit; text-align: left; cursor: pointer; }
        .guideCard.active, .guideCard:hover { border-width: 2px; box-shadow: 0 8px 24px rgba(0,0,0,.08); }
        .guideCardHead { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
        .guideCard span, .guideCard p, .guideCard small { opacity: .76; }
        .guideCard p { margin: 0; }
        .knowledgeDetail { min-width: 0; }
        .emphasis { border-width: 2px; }
        @media (max-width: 980px) {
          .metricGrid { grid-template-columns: repeat(2,minmax(0,1fr)); }
          .knowledgeToolbar { grid-template-columns: 1fr 1fr; }
          .knowledgeToolbar input { grid-column: 1 / -1; }
          .knowledgeLayout { grid-template-columns: 1fr; }
          .guideList { max-height: none; grid-template-columns: repeat(2,minmax(0,1fr)); }
        }
        @media (max-width: 640px) {
          .knowledgeHero { flex-direction: column; align-items: stretch; }
          .metricGrid, .knowledgeToolbar, .guideList { grid-template-columns: 1fr; }
          .knowledgeToolbar input { grid-column: auto; }
        }
      `}</style>
    </main>
  );
}
