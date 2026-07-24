import Link from 'next/link';
import { requireUser } from '../../lib/auth/authorization';
import { createSupabaseServerClient } from '../../lib/supabase/server';

function formatDate(value: string | null): string {
  if (!value) return 'Chưa có';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

type DocumentRow = {
  id: string;
  dossier_id: string;
  name: string;
  document_type: string | null;
  version: number;
  status: string;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
  dossiers: { code?: string; title?: string } | null;
};

type VersionGroup = {
  key: string;
  dossierId: string;
  dossierCode: string;
  dossierTitle: string;
  documentName: string;
  documentType: string;
  versions: DocumentRow[];
};

export default async function VersionControlPage() {
  const user = await requireUser();

  if (!user.enterpriseId) {
    return (
      <main className="shell">
        <section className="panel">
          <h1>Chưa xác định doanh nghiệp</h1>
          <p className="muted">Tài khoản cần được gắn với doanh nghiệp trước khi xem phiên bản tài liệu.</p>
        </section>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const result = await supabase
    .from('documents')
    .select('id, dossier_id, name, document_type, version, status, storage_path, created_at, updated_at, dossiers(code, title)')
    .eq('enterprise_id', user.enterpriseId)
    .order('updated_at', { ascending: false })
    .limit(300);

  if (result.error) throw new Error(`Không thể đọc phiên bản tài liệu: ${result.error.message}`);

  const rows = (result.data ?? []) as DocumentRow[];
  const grouped = new Map<string, VersionGroup>();

  for (const row of rows) {
    const normalizedName = row.name.trim().toLocaleLowerCase('vi-VN');
    const key = `${row.dossier_id}::${normalizedName}`;
    const existing = grouped.get(key);

    if (existing) {
      existing.versions.push(row);
      continue;
    }

    grouped.set(key, {
      key,
      dossierId: row.dossier_id,
      dossierCode: row.dossiers?.code || 'Hồ sơ',
      dossierTitle: row.dossiers?.title || 'Chưa có tên hồ sơ',
      documentName: row.name,
      documentType: row.document_type || 'Chưa phân loại',
      versions: [row],
    });
  }

  const groups = [...grouped.values()]
    .map((group) => ({
      ...group,
      versions: group.versions.sort((a, b) => {
        if (b.version !== a.version) return b.version - a.version;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }),
    }))
    .sort((a, b) => new Date(b.versions[0].updated_at).getTime() - new Date(a.versions[0].updated_at).getTime());

  const totalVersions = groups.reduce((sum, group) => sum + group.versions.length, 0);
  const multiVersionGroups = groups.filter((group) => group.versions.length > 1).length;
  const latestVerified = groups.filter((group) => group.versions[0]?.status === 'verified').length;
  const missingFiles = rows.filter((row) => !row.storage_path).length;

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <Link className="brand" href="/dashboard">HTL HỒ SƠ CHUẨN</Link>
          <div className="tagline">Kiểm soát phiên bản: biết bản nào mới nhất và bản nào đang được dùng</div>
        </div>
        <div className="actions">
          <Link className="primary secondary" href="/dashboard">Dashboard</Link>
          <Link className="primary secondary" href="/nhat-ky">Nhật ký</Link>
          <Link className="primary secondary" href="/tim-kiem">Tìm kiếm</Link>
        </div>
      </header>

      <section className="panel">
        <div className="eyebrow">KIỂM SOÁT PHIÊN BẢN</div>
        <h1>Không dùng nhầm bản cũ của cùng một tài liệu</h1>
        <p className="muted">HTL nhóm các tài liệu trùng tên trong cùng hồ sơ, xác định bản mới nhất và giữ lại toàn bộ lịch sử để truy vết.</p>

        <div className="dossierToolbar">
          <div><strong>Nhóm tài liệu:</strong> {groups.length}</div>
          <div><strong>Tổng phiên bản:</strong> {totalVersions}</div>
          <div><strong>Có nhiều phiên bản:</strong> {multiVersionGroups}</div>
          <div><strong>Bản mới nhất đã xác minh:</strong> {latestVerified}</div>
          <div><strong>Thiếu tệp lưu trữ:</strong> {missingFiles}</div>
        </div>
      </section>

      <section className="panel">
        <div className="eyebrow">NGUYÊN TẮC SỬ DỤNG</div>
        <h2>Mỗi tài liệu chỉ có một bản đang được ưu tiên</h2>
        <div className="emptyState">
          <strong>Bản có số phiên bản cao nhất được xem là bản mới nhất.</strong>
          <p>Các bản cũ vẫn được giữ để đối chiếu, nhưng người dùng cần kiểm tra trạng thái và thời điểm cập nhật trước khi tiếp tục công việc.</p>
        </div>
      </section>

      <section className="panel">
        <div className="eyebrow">DANH SÁCH PHIÊN BẢN</div>
        <h2>{groups.length} nhóm tài liệu</h2>
        <div className="dossierList">
          {!groups.length && <div className="emptyState">Chưa có tài liệu nào để quản lý phiên bản.</div>}

          {groups.map((group) => {
            const latest = group.versions[0];
            return (
              <article className="dossierItem" key={group.key}>
                <div>
                  <strong>{group.documentType}</strong>
                  <h3>{group.documentName}</h3>
                  <p>{group.dossierCode} · {group.dossierTitle}</p>
                  <small>{group.versions.length} phiên bản · Cập nhật gần nhất {formatDate(latest.updated_at)}</small>

                  <div className="dossierList">
                    {group.versions.map((version, index) => (
                      <Link className="dossierItem" href={`/ho-so/${group.dossierId}`} key={version.id}>
                        <div>
                          <strong>{index === 0 ? 'BẢN MỚI NHẤT' : 'BẢN CŨ'}</strong>
                          <h3>Phiên bản {version.version}</h3>
                          <p>Trạng thái: {version.status} · {version.storage_path ? 'Đã có tệp lưu trữ' : 'Chưa có tệp lưu trữ'}</p>
                          <small>Tạo {formatDate(version.created_at)} · Cập nhật {formatDate(version.updated_at)}</small>
                        </div>
                        <div className="dossierMeta">
                          <span className="badge">{index === 0 ? 'Đang ưu tiên' : 'Chỉ đối chiếu'}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="dossierMeta">
                  <span className="badge">Bản {latest.version}</span>
                  <Link className="primary secondary dossierAction" href={`/ho-so/${group.dossierId}`}>Mở hồ sơ</Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
