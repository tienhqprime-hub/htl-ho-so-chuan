import Link from 'next/link';
import { requireUser } from '../../lib/auth/authorization';
import { createSupabaseServerClient } from '../../lib/supabase/server';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

type AuditItem = {
  id: string;
  time: string;
  type: 'dossier' | 'document' | 'workflow';
  title: string;
  detail: string;
  dossierId: string;
  dossierCode: string;
  status: string;
};

export default async function AuditLogPage() {
  const user = await requireUser();

  if (!user.enterpriseId) {
    return (
      <main className="shell">
        <section className="panel">
          <h1>Chưa xác định doanh nghiệp</h1>
          <p className="muted">Tài khoản cần được gắn với doanh nghiệp trước khi xem nhật ký hoạt động.</p>
        </section>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const [dossiersResult, documentsResult, workflowsResult] = await Promise.all([
    supabase
      .from('dossiers')
      .select('id, code, title, status, created_at, updated_at')
      .eq('enterprise_id', user.enterpriseId)
      .order('updated_at', { ascending: false })
      .limit(100),
    supabase
      .from('documents')
      .select('id, dossier_id, name, document_type, status, created_at, updated_at, dossiers(code)')
      .eq('enterprise_id', user.enterpriseId)
      .order('updated_at', { ascending: false })
      .limit(100),
    supabase
      .from('workflow_instances')
      .select('id, dossier_id, workflow_key, current_step, status, created_at, updated_at, dossiers(code)')
      .eq('enterprise_id', user.enterpriseId)
      .order('updated_at', { ascending: false })
      .limit(100),
  ]);

  if (dossiersResult.error) throw new Error(`Không thể đọc nhật ký hồ sơ: ${dossiersResult.error.message}`);
  if (documentsResult.error) throw new Error(`Không thể đọc nhật ký tài liệu: ${documentsResult.error.message}`);
  if (workflowsResult.error) throw new Error(`Không thể đọc nhật ký công việc: ${workflowsResult.error.message}`);

  const items: AuditItem[] = [
    ...(dossiersResult.data ?? []).flatMap((item) => {
      const events: AuditItem[] = [{
        id: `dossier-created-${item.id}`,
        time: item.created_at,
        type: 'dossier',
        title: 'Hồ sơ được tạo',
        detail: `${item.code} · ${item.title}`,
        dossierId: item.id,
        dossierCode: item.code,
        status: item.status,
      }];

      if (item.updated_at !== item.created_at) {
        events.push({
          id: `dossier-updated-${item.id}`,
          time: item.updated_at,
          type: 'dossier',
          title: 'Hồ sơ được cập nhật',
          detail: `${item.code} · Trạng thái hiện tại: ${item.status}`,
          dossierId: item.id,
          dossierCode: item.code,
          status: item.status,
        });
      }

      return events;
    }),
    ...(documentsResult.data ?? []).flatMap((item) => {
      const dossier = item.dossiers as { code?: string } | null;
      const events: AuditItem[] = [{
        id: `document-created-${item.id}`,
        time: item.created_at,
        type: 'document',
        title: 'Tài liệu được thêm vào hồ sơ',
        detail: `${item.name} · ${item.document_type || 'Chưa phân loại'}`,
        dossierId: item.dossier_id,
        dossierCode: dossier?.code || 'Hồ sơ',
        status: item.status,
      }];

      if (item.updated_at !== item.created_at) {
        events.push({
          id: `document-updated-${item.id}`,
          time: item.updated_at,
          type: 'document',
          title: 'Tài liệu được cập nhật',
          detail: `${item.name} · Trạng thái hiện tại: ${item.status}`,
          dossierId: item.dossier_id,
          dossierCode: dossier?.code || 'Hồ sơ',
          status: item.status,
        });
      }

      return events;
    }),
    ...(workflowsResult.data ?? []).flatMap((item) => {
      const dossier = item.dossiers as { code?: string } | null;
      const events: AuditItem[] = [{
        id: `workflow-created-${item.id}`,
        time: item.created_at,
        type: 'workflow',
        title: 'Công việc được khởi tạo',
        detail: `${item.workflow_key} · Bước: ${item.current_step || 'Chưa xác định'}`,
        dossierId: item.dossier_id,
        dossierCode: dossier?.code || 'Hồ sơ',
        status: item.status,
      }];

      if (item.updated_at !== item.created_at) {
        events.push({
          id: `workflow-updated-${item.id}`,
          time: item.updated_at,
          type: 'workflow',
          title: item.status === 'completed' ? 'Công việc đã hoàn thành' : 'Công việc được cập nhật',
          detail: `${item.workflow_key} · Bước hiện tại: ${item.current_step || 'Chưa xác định'}`,
          dossierId: item.dossier_id,
          dossierCode: dossier?.code || 'Hồ sơ',
          status: item.status,
        });
      }

      return events;
    }),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const dossierEvents = items.filter((item) => item.type === 'dossier').length;
  const documentEvents = items.filter((item) => item.type === 'document').length;
  const workflowEvents = items.filter((item) => item.type === 'workflow').length;

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <Link className="brand" href="/dashboard">HTL HỒ SƠ CHUẨN</Link>
          <div className="tagline">Nhật ký minh bạch: biết điều gì đã thay đổi và khi nào</div>
        </div>
        <div className="actions">
          <Link className="primary secondary" href="/dashboard">Dashboard</Link>
          <Link className="primary secondary" href="/tim-kiem">Tìm kiếm</Link>
          <Link className="primary secondary" href="/thong-bao">Thông báo</Link>
        </div>
      </header>

      <section className="panel">
        <div className="eyebrow">NHẬT KÝ HOẠT ĐỘNG</div>
        <h1>Toàn bộ thay đổi quan trọng trong một dòng thời gian</h1>
        <p className="muted">Trang này tổng hợp các mốc tạo mới và cập nhật từ hồ sơ, tài liệu và công việc. Mục tiêu là truy vết nhanh, không để người dùng phải đoán dữ liệu đã đổi lúc nào.</p>

        <div className="dossierToolbar">
          <div><strong>Tổng sự kiện:</strong> {items.length}</div>
          <div><strong>Hồ sơ:</strong> {dossierEvents}</div>
          <div><strong>Tài liệu:</strong> {documentEvents}</div>
          <div><strong>Công việc:</strong> {workflowEvents}</div>
        </div>
      </section>

      <section className="panel">
        <div className="eyebrow">DÒNG THỜI GIAN</div>
        <h2>Mới nhất trước</h2>
        <div className="dossierList">
          {!items.length && <div className="emptyState">Chưa có hoạt động nào để hiển thị.</div>}
          {items.map((item, index) => (
            <Link className="dossierItem" href={`/ho-so/${item.dossierId}`} key={item.id}>
              <div>
                <strong>{index === 0 ? 'MỚI NHẤT' : item.type === 'dossier' ? 'HỒ SƠ' : item.type === 'document' ? 'TÀI LIỆU' : 'CÔNG VIỆC'}</strong>
                <h3>{item.title}</h3>
                <p>{item.dossierCode} · {item.detail}</p>
                <small>{formatDate(item.time)}</small>
              </div>
              <div className="dossierMeta">
                <span className="badge">{item.status}</span>
                <small>Mở hồ sơ liên quan</small>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
