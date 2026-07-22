'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Dossier,
  DossierStatus,
  VerificationHistoryItem,
  readDossiers,
  readVerificationHistory,
  writeDossiers,
} from '../../lib/dossier-storage';

const statuses: DossierStatus[] = ['Mới tiếp nhận','Đang kiểm tra','Chờ bổ sung','Hoàn thành','Đã đóng'];

export default function DossiersPage() {
  const [items,setItems] = useState<Dossier[]>([]);
  const [history,setHistory] = useState<VerificationHistoryItem[]>([]);
  const [query,setQuery] = useState('');
  const [status,setStatus] = useState<'Tất cả'|DossierStatus>('Tất cả');
  const [ready,setReady] = useState(false);
  const [expandedId,setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setItems(readDossiers());
    setHistory(readVerificationHistory());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) writeDossiers(items);
  }, [items,ready]);

  const filtered = useMemo(() => items.filter((item) => {
    const text = `${item.code} ${item.name} ${item.company} ${item.category} ${item.owner}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (status === 'Tất cả' || item.status === status);
  }), [items,query,status]);

  const historyByDossier = useMemo(() => {
    return history.reduce<Record<string, VerificationHistoryItem[]>>((groups, entry) => {
      (groups[entry.dossierId] ||= []).push(entry);
      return groups;
    }, {});
  }, [history]);

  function createDossier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const now = new Date();
    const item: Dossier = {
      id: crypto.randomUUID(),
      code: `HTL-${now.getFullYear()}-${String(items.length + 1).padStart(6,'0')}`,
      name: String(data.get('name') || '').trim(),
      company: String(data.get('company') || '').trim(),
      category: String(data.get('category') || '').trim(),
      owner: String(data.get('owner') || '').trim(),
      status: 'Mới tiếp nhận',
      createdAt: now.toLocaleDateString('vi-VN'),
    };
    if (!item.name || !item.company) return;
    setItems((current) => [item,...current]);
    event.currentTarget.reset();
  }

  function verificationUrl(item: Dossier) {
    const params = new URLSearchParams({ dossierId: item.id, code: item.code, name: item.name, company: item.company });
    return `/kiem-tra?${params.toString()}`;
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div><div className="brand">HTL HỒ SƠ CHUẨN</div><div className="tagline">Quản lý hồ sơ doanh nghiệp</div></div>
        <div className="actions"><Link className="secondary primary" href="/">Trang chủ</Link><Link className="primary" href="/kiem-tra">Kiểm tra tài liệu</Link></div>
      </header>

      <section className="panel">
        <div className="eyebrow">MODULE QUẢN LÝ HỒ SƠ</div>
        <h1>Danh sách hồ sơ</h1>
        <p className="muted">Tạo, tìm kiếm, theo dõi trạng thái và xem lại lịch sử kiểm tra của từng hồ sơ. Dữ liệu bản thử nghiệm được lưu trên trình duyệt này.</p>
        <form className="dossierForm" onSubmit={createDossier}>
          <input name="name" placeholder="Tên hồ sơ *" required />
          <input name="company" placeholder="Doanh nghiệp/khách hàng *" required />
          <input name="category" placeholder="Loại hồ sơ" />
          <input name="owner" placeholder="Người phụ trách" />
          <button className="primary" type="submit">Tạo hồ sơ</button>
        </form>
      </section>

      <section className="panel">
        <div className="dossierToolbar">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm mã, tên, doanh nghiệp..." />
          <select value={status} onChange={(e) => setStatus(e.target.value as 'Tất cả'|DossierStatus)}>
            <option>Tất cả</option>{statuses.map((value) => <option key={value}>{value}</option>)}
          </select>
        </div>
        <div className="dossierList">
          {!filtered.length && <div className="emptyState">Chưa có hồ sơ phù hợp.</div>}
          {filtered.map((item) => {
            const entries = historyByDossier[item.id] || [];
            const expanded = expandedId === item.id;
            return (
              <article className="dossierItem" key={item.id}>
                <div>
                  <strong>{item.code}</strong>
                  <h3>{item.name}</h3>
                  <p>{item.company} · {item.category || 'Chưa phân loại'} · {item.owner || 'Chưa phân công'}</p>
                  <small>{entries.length} lần kiểm tra đã lưu</small>

                  {expanded && (
                    <div className="historyList">
                      {!entries.length && <div className="emptyState">Hồ sơ này chưa có lịch sử kiểm tra.</div>}
                      {entries.map((entry) => (
                        <section className="finding" key={entry.id}>
                          <div className="resultHead">
                            <div><small>{entry.createdAt}</small><h3>{entry.status}</h3></div>
                            <div className="score"><strong>{entry.confidence}%</strong><span>Mức độ tự tin</span></div>
                          </div>
                          <p>{entry.summary}</p>
                          <p><strong>Tài liệu:</strong> {entry.fileNames.join(', ') || 'Không có tên tệp'}</p>
                          <p><strong>Nội dung cần làm rõ:</strong> {entry.context || 'Không ghi thêm yêu cầu'}</p>
                        </section>
                      ))}
                    </div>
                  )}
                </div>
                <div className="dossierMeta">
                  <span className="badge">{item.status}</span>
                  <small>{item.createdAt}</small>
                  <button className="primary secondary dossierAction" type="button" onClick={() => setExpandedId(expanded ? null : item.id)}>
                    {expanded ? 'Ẩn lịch sử' : 'Xem lịch sử'}
                  </button>
                  <Link className="primary dossierAction" href={verificationUrl(item)}>Kiểm tra tài liệu</Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
