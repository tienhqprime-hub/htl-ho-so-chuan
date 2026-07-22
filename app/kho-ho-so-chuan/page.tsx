'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  DOSSIER_RULE_TEMPLATES,
  GENERAL_DOSSIER_TEMPLATE,
  DossierRuleTemplate,
  normalizeRuleText,
} from '../../lib/dossier-rules';

const allTemplates = [GENERAL_DOSSIER_TEMPLATE, ...DOSSIER_RULE_TEMPLATES];

function templateGroup(template: DossierRuleTemplate) {
  if (template.id.includes('contract')) return 'Hợp đồng';
  if (template.id.includes('internal')) return 'Quản trị nội bộ';
  if (template.id.includes('business')) return 'Doanh nghiệp';
  return 'Tổng quát';
}

function buildCreateUrl(template: DossierRuleTemplate) {
  const query = new URLSearchParams({ category: template.name });
  return `/ho-so?${query.toString()}`;
}

export default function StandardDossierLibraryPage() {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('Tất cả');
  const [selectedId, setSelectedId] = useState(allTemplates[0].id);

  const groups = useMemo(() => ['Tất cả', ...Array.from(new Set(allTemplates.map(templateGroup)))], []);
  const filtered = useMemo(() => {
    const normalized = normalizeRuleText(query);
    return allTemplates.filter((template) => {
      const text = normalizeRuleText(`${template.name} ${template.description} ${template.aliases.join(' ')} ${template.items.map((item) => item.name).join(' ')}`);
      return (!normalized || text.includes(normalized)) && (group === 'Tất cả' || templateGroup(template) === group);
    });
  }, [query, group]);

  const selected = allTemplates.find((template) => template.id === selectedId) || filtered[0] || allTemplates[0];
  const requiredCount = selected.items.filter((item) => item.required).length;
  const optionalCount = selected.items.length - requiredCount;

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <Link className="brand" href="/">HTL HỒ SƠ CHUẨN</Link>
          <div className="tagline">Thư viện mẫu hồ sơ và checklist chuẩn</div>
        </div>
        <div className="actions">
          <Link className="primary secondary" href="/dashboard">Dashboard</Link>
          <Link className="primary secondary" href="/ho-so">Danh sách hồ sơ</Link>
        </div>
      </header>

      <section className="panel libraryHero">
        <div>
          <div className="eyebrow">KHO HỒ SƠ CHUẨN</div>
          <h1>Chọn đúng mẫu, khởi tạo đúng cấu trúc ngay từ đầu</h1>
          <p className="leadResult muted">Mỗi mẫu cung cấp danh mục tài liệu, mục đích kiểm tra và cấu trúc checklist để người dùng không phải bắt đầu từ trang trắng.</p>
        </div>
        <div className="heroMetric"><strong>{allTemplates.length}</strong><span>mẫu đang có</span></div>
      </section>

      <section className="panel">
        <div className="libraryToolbar">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên hồ sơ, tài liệu hoặc nghiệp vụ..." />
          <select value={group} onChange={(event) => setGroup(event.target.value)}>
            {groups.map((value) => <option key={value}>{value}</option>)}
          </select>
        </div>

        <div className="libraryLayout">
          <div className="templateList">
            {!filtered.length && <div className="emptyState">Không tìm thấy mẫu phù hợp.</div>}
            {filtered.map((template) => {
              const required = template.items.filter((item) => item.required).length;
              return (
                <button
                  className={`templateCard ${selected.id === template.id ? 'active' : ''}`}
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedId(template.id)}
                >
                  <small>{templateGroup(template)}</small>
                  <strong>{template.name}</strong>
                  <span>{template.description}</span>
                  <footer>{required} bắt buộc · {template.items.length - required} bổ sung</footer>
                </button>
              );
            })}
          </div>

          <article className="templateDetail">
            <div className="resultHead">
              <div>
                <div className="eyebrow">MẪU ĐANG CHỌN</div>
                <h2>{selected.name}</h2>
                <p className="muted">{selected.description}</p>
              </div>
              <div className="score"><strong>{selected.items.length}</strong><span>thành phần</span></div>
            </div>

            <div className="metricMiniGrid">
              <div><strong>{requiredCount}</strong><span>Tài liệu bắt buộc</span></div>
              <div><strong>{optionalCount}</strong><span>Tài liệu bổ sung</span></div>
              <div><strong>{selected.aliases.length}</strong><span>Từ khóa nhận diện</span></div>
            </div>

            <div className="historyList">
              {selected.items.map((item, index) => (
                <section className="finding" key={item.name}>
                  <div className="resultHead">
                    <div>
                      <small>THÀNH PHẦN {index + 1}</small>
                      <h3>{item.name}</h3>
                    </div>
                    <span className={`badge ${item.required ? 'cao' : 'thông-tin'}`}>{item.required ? 'BẮT BUỘC' : 'BỔ SUNG'}</span>
                  </div>
                  <p>{item.purpose}</p>
                </section>
              ))}
            </div>

            <div className="notice">
              <h3>Nguyên tắc sử dụng</h3>
              <p>Mẫu này là khung nghiệp vụ ban đầu. Người xử lý vẫn cần đối chiếu quy định, yêu cầu của cơ quan hoặc đối tác và tình huống thực tế trước khi kết luận hồ sơ đã đầy đủ hoặc hợp lệ.</p>
            </div>

            <div className="actions">
              <Link className="primary" href={buildCreateUrl(selected)}>Dùng mẫu này để tạo hồ sơ</Link>
              <span className="muted">Checklist sẽ được sinh tự động theo loại hồ sơ đã chọn.</span>
            </div>
          </article>
        </div>
      </section>

      <section className="panel">
        <div className="finding">
          <h3>Kết luận cho người sử dụng</h3>
          <p>Kho Hồ sơ Chuẩn giúp chuẩn hóa bước khởi tạo và giảm nguy cơ bỏ sót thành phần. Đây chưa phải là kết luận pháp lý tự động; mọi mẫu cần được cập nhật khi quy định hoặc yêu cầu nghiệp vụ thay đổi.</p>
        </div>
      </section>

      <style jsx>{`
        .libraryHero { display: flex; justify-content: space-between; align-items: center; gap: 28px; }
        .heroMetric { min-width: 170px; text-align: center; border: 1px solid rgba(120,120,120,.24); border-radius: 18px; padding: 22px; }
        .heroMetric strong, .heroMetric span { display: block; }
        .heroMetric strong { font-size: 3rem; line-height: 1; }
        .libraryToolbar { display: grid; grid-template-columns: 1fr 240px; gap: 12px; margin-bottom: 20px; }
        .libraryLayout { display: grid; grid-template-columns: minmax(260px, .8fr) minmax(0, 1.7fr); gap: 20px; align-items: start; }
        .templateList { display: grid; gap: 10px; position: sticky; top: 18px; }
        .templateCard { text-align: left; display: grid; gap: 8px; width: 100%; padding: 16px; border-radius: 16px; border: 1px solid rgba(120,120,120,.22); background: transparent; color: inherit; cursor: pointer; }
        .templateCard:hover, .templateCard.active { border-width: 2px; box-shadow: 0 8px 26px rgba(0,0,0,.08); }
        .templateCard strong { font-size: 1.05rem; }
        .templateCard span, .templateCard footer, .templateCard small { opacity: .72; }
        .templateDetail { min-width: 0; }
        .metricMiniGrid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; margin: 18px 0; }
        .metricMiniGrid div { border: 1px solid rgba(120,120,120,.2); border-radius: 14px; padding: 14px; }
        .metricMiniGrid strong, .metricMiniGrid span { display: block; }
        .metricMiniGrid strong { font-size: 1.5rem; }
        @media (max-width: 900px) {
          .libraryLayout { grid-template-columns: 1fr; }
          .templateList { position: static; grid-template-columns: repeat(2, minmax(0,1fr)); }
        }
        @media (max-width: 640px) {
          .libraryHero { flex-direction: column; align-items: stretch; }
          .libraryToolbar, .templateList, .metricMiniGrid { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
