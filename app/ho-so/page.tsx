import Link from 'next/link';
import { createDossierAction } from '../actions/dossiers';
import { requireUser } from '../../lib/auth/authorization';
import { listDossiers, type DossierStatus } from '../../lib/data/dossiers';

const statusLabels: Record<DossierStatus, string> = {
  draft: 'Bản nháp',
  in_review: 'Đang xem xét',
  approved: 'Đã phê duyệt',
  rejected: 'Bị từ chối',
  archived: 'Đã lưu trữ',
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

export default async function DossiersPage({
  searchParams,
}: {
  searchParams?: { q?: string; status?: string };
}) {
  const user = await requireUser();

  if (!user.enterpriseId) {
    return (
      <main className="shell">
        <section className="panel emptyState">
          <div className="eyebrow">MODULE QUẢN LÝ HỒ SƠ</div>
          <h1>Chưa xác định doanh nghiệp</h1>
          <p>Quản trị viên cần gắn tài khoản này với một doanh nghiệp trước khi tạo và quản lý hồ sơ.</p>
        </section>
      </main>
    );
  }

  const dossiers = await listDossiers(user.enterpriseId);
  const query = String(searchParams?.q ?? '').trim().toLowerCase();
  const selectedStatus = String(searchParams?.status ?? 'all');
  const filtered = dossiers.filter((item) => {
    const matchesText = !query || `${item.code} ${item.title} ${item.category ?? ''} ${item.description ?? ''}`.toLowerCase().includes(query);
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    return matchesText && matchesStatus;
  });

  async function createAction(formData: FormData): Promise<void> {
    'use server';
    await createDossierAction(formData);
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <Link className="brand" href="/">HTL HỒ SƠ CHUẨN</Link>
          <div className="tagline">Quản lý hồ sơ doanh nghiệp trên Supabase</div>
        </div>
        <div className="actions">
          <Link className="secondary primary" href="/dashboard">Dashboard</Link>
          <Link className="primary" href="/kiem-tra">Kiểm tra tài liệu</Link>
        </div>
      </header>

      <section className="panel">
        <div className="eyebrow">MODULE QUẢN LÝ HỒ SƠ</div>
        <h1>Danh sách hồ sơ</h1>
        <p className="muted">Tạo và theo dõi hồ sơ thật của doanh nghiệp. Dữ liệu được bảo vệ theo tài khoản và Row Level Security.</p>

        <form className="dossierForm" action={createAction}>
          <input name="enterpriseId" type="hidden" value={user.enterpriseId} />
          <input name="code" placeholder="Mã hồ sơ *" required />
          <input name="title" placeholder="Tên hồ sơ *" required />
          <input name="category" placeholder="Loại hồ sơ" />
          <input name="description" placeholder="Mô tả ngắn" />
          <input name="status" type="hidden" value="draft" />
          <button className="primary" type="submit">Tạo hồ sơ</button>
        </form>
      </section>

      <section className="panel">
        <form className="dossierToolbar" method="get">
          <input defaultValue={searchParams?.q ?? ''} name="q" placeholder="Tìm mã, tên, loại hồ sơ..." />
          <select defaultValue={selectedStatus} name="status">
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button className="primary secondary" type="submit">Lọc hồ sơ</button>
        </form>

        <div className="dossierList">
          {!filtered.length && <div className="emptyState">Chưa có hồ sơ phù hợp.</div>}
          {filtered.map((item) => (
            <article className="dossierItem" key={item.id}>
              <div>
                <strong>{item.code}</strong>
                <h3>{item.title}</h3>
                <p>{item.category || 'Chưa phân loại'} · {item.description || 'Chưa có mô tả'}</p>
                <small>Cập nhật: {formatDate(item.updated_at)}</small>
              </div>
              <div className="dossierMeta">
                <span className="badge">{statusLabels[item.status]}</span>
                <small>Tạo ngày {formatDate(item.created_at)}</small>
                <Link className="primary secondary dossierAction" href={`/ho-so/${item.id}`}>Mở hồ sơ</Link>
                <Link className="primary dossierAction" href={`/kiem-tra?dossierId=${item.id}&code=${encodeURIComponent(item.code)}&name=${encodeURIComponent(item.title)}`}>Kiểm tra tài liệu</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
