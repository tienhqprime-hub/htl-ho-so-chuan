import Link from 'next/link';
import { requireUser } from '../../lib/auth/authorization';
import { createSupabaseServerClient } from '../../lib/supabase/server';

function text(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

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

export default async function AdvancedSearchPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await requireUser();
  const query = text(searchParams.q).trim();
  const type = text(searchParams.type) || 'all';
  const status = text(searchParams.status);
  const from = text(searchParams.from);
  const to = text(searchParams.to);

  if (!user.enterpriseId) {
    return (
      <main className="shell">
        <section className="panel">
          <h1>Chưa xác định doanh nghiệp</h1>
          <p className="muted">Quản trị viên cần gắn tài khoản với doanh nghiệp trước khi dùng tìm kiếm nâng cao.</p>
        </section>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const shouldSearch = Boolean(query || status || from || to);

  let dossiers: any[] = [];
  let documents: any[] = [];
  let workflows: any[] = [];

  if (shouldSearch) {
    if (type === 'all' || type === 'dossier') {
      let dossierQuery = supabase
        .from('dossiers')
        .select('id, code, title, description, category, status, created_at, updated_at')
        .eq('enterprise_id', user.enterpriseId)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (query) {
        const safe = query.replace(/[%_,()]/g, ' ');
        dossierQuery = dossierQuery.or(`code.ilike.%${safe}%,title.ilike.%${safe}%,description.ilike.%${safe}%,category.ilike.%${safe}%`);
      }
      if (status) dossierQuery = dossierQuery.eq('status', status);
      if (from) dossierQuery = dossierQuery.gte('updated_at', `${from}T00:00:00`);
      if (to) dossierQuery = dossierQuery.lte('updated_at', `${to}T23:59:59`);

      const result = await dossierQuery;
      if (result.error) throw new Error(`Không thể tìm hồ sơ: ${result.error.message}`);
      dossiers = result.data ?? [];
    }

    if (type === 'all' || type === 'document') {
      let documentQuery = supabase
        .from('documents')
        .select('id, dossier_id, name, document_type, status, version, expires_at, updated_at, dossiers(code, title)')
        .eq('enterprise_id', user.enterpriseId)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (query) {
        const safe = query.replace(/[%_,()]/g, ' ');
        documentQuery = documentQuery.or(`name.ilike.%${safe}%,document_type.ilike.%${safe}%`);
      }
      if (status) documentQuery = documentQuery.eq('status', status);
      if (from) documentQuery = documentQuery.gte('updated_at', `${from}T00:00:00`);
      if (to) documentQuery = documentQuery.lte('updated_at', `${to}T23:59:59`);

      const result = await documentQuery;
      if (result.error) throw new Error(`Không thể tìm tài liệu: ${result.error.message}`);
      documents = result.data ?? [];
    }

    if (type === 'all' || type === 'workflow') {
      let workflowQuery = supabase
        .from('workflow_instances')
        .select('id, dossier_id, workflow_key, current_step, status, assigned_to, updated_at, dossiers(code, title)')
        .eq('enterprise_id', user.enterpriseId)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (query) {
        const safe = query.replace(/[%_,()]/g, ' ');
        workflowQuery = workflowQuery.or(`workflow_key.ilike.%${safe}%,current_step.ilike.%${safe}%`);
      }
      if (status) workflowQuery = workflowQuery.eq('status', status);
      if (from) workflowQuery = workflowQuery.gte('updated_at', `${from}T00:00:00`);
      if (to) workflowQuery = workflowQuery.lte('updated_at', `${to}T23:59:59`);

      const result = await workflowQuery;
      if (result.error) throw new Error(`Không thể tìm công việc: ${result.error.message}`);
      workflows = result.data ?? [];
    }
  }

  const total = dossiers.length + documents.length + workflows.length;

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <Link className="brand" href="/dashboard">HTL HỒ SƠ CHUẨN</Link>
          <div className="tagline">Tìm một lần trên toàn doanh nghiệp</div>
        </div>
        <div className="actions">
          <Link className="primary secondary" href="/dashboard">Dashboard</Link>
          <Link className="primary secondary" href="/cong-viec">Công việc</Link>
          <Link className="primary secondary" href="/thong-bao">Thông báo</Link>
        </div>
      </header>

      <section className="panel">
        <div className="eyebrow">TÌM KIẾM NÂNG CAO</div>
        <h1>Tìm hồ sơ, tài liệu và công việc từ một cửa</h1>
        <p className="muted">Không chỉ tìm theo tên. Có thể lọc theo loại dữ liệu, trạng thái và khoảng thời gian cập nhật.</p>

        <form className="dossierForm" action="/tim-kiem" method="get">
          <input defaultValue={query} name="q" placeholder="Mã hồ sơ, tên tài liệu, loại giấy tờ, bước công việc..." />
          <select defaultValue={type} name="type">
            <option value="all">Tất cả dữ liệu</option>
            <option value="dossier">Hồ sơ</option>
            <option value="document">Tài liệu</option>
            <option value="workflow">Công việc</option>
          </select>
          <select defaultValue={status} name="status">
            <option value="">Mọi trạng thái</option>
            <option value="draft">Bản nháp</option>
            <option value="in_review">Đang xem xét</option>
            <option value="approved">Đã phê duyệt</option>
            <option value="rejected">Bị từ chối</option>
            <option value="submitted">Đã nộp</option>
            <option value="verified">Đã xác minh</option>
            <option value="expired">Hết hạn</option>
            <option value="pending">Chờ bắt đầu</option>
            <option value="active">Đang xử lý</option>
            <option value="completed">Đã hoàn thành</option>
            <option value="cancelled">Đã dừng</option>
          </select>
          <input defaultValue={from} name="from" type="date" aria-label="Từ ngày" />
          <input defaultValue={to} name="to" type="date" aria-label="Đến ngày" />
          <button className="primary" type="submit">Tìm ngay</button>
        </form>
      </section>

      <section className="panel">
        <div className="eyebrow">KẾT QUẢ</div>
        <h2>{shouldSearch ? `${total} kết quả phù hợp` : 'Nhập điều kiện để bắt đầu tìm kiếm'}</h2>
        {!shouldSearch && (
          <div className="emptyState">Ví dụ: tìm “CO”, lọc tài liệu hết hạn hoặc xem toàn bộ công việc đang xử lý trong tuần này.</div>
        )}
        {shouldSearch && total === 0 && (
          <div className="emptyState">Không tìm thấy dữ liệu phù hợp. Hãy bỏ bớt một điều kiện hoặc thử từ khóa rộng hơn.</div>
        )}
      </section>

      {dossiers.length > 0 && (
        <section className="panel">
          <div className="eyebrow">HỒ SƠ</div>
          <h2>{dossiers.length} hồ sơ</h2>
          <div className="dossierList">
            {dossiers.map((item) => (
              <Link className="dossierItem" href={`/ho-so/${item.id}`} key={item.id}>
                <div>
                  <strong>{item.code}</strong>
                  <h3>{item.title}</h3>
                  <p>{item.description || item.category || 'Chưa có mô tả'}</p>
                  <small>Cập nhật {formatDate(item.updated_at)}</small>
                </div>
                <div className="dossierMeta"><span className="badge">{item.status}</span></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {documents.length > 0 && (
        <section className="panel">
          <div className="eyebrow">TÀI LIỆU</div>
          <h2>{documents.length} tài liệu</h2>
          <div className="dossierList">
            {documents.map((item) => {
              const dossier = item.dossiers as { code?: string; title?: string } | null;
              return (
                <Link className="dossierItem" href={`/ho-so/${item.dossier_id}`} key={item.id}>
                  <div>
                    <strong>{item.document_type || 'Chưa phân loại'}</strong>
                    <h3>{item.name}</h3>
                    <p>{dossier?.code || 'Hồ sơ'} · {dossier?.title || 'Chưa có tên'} · Phiên bản {item.version}</p>
                    <small>Hết hạn {formatDate(item.expires_at)} · Cập nhật {formatDate(item.updated_at)}</small>
                  </div>
                  <div className="dossierMeta"><span className="badge">{item.status}</span></div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {workflows.length > 0 && (
        <section className="panel">
          <div className="eyebrow">CÔNG VIỆC</div>
          <h2>{workflows.length} công việc</h2>
          <div className="dossierList">
            {workflows.map((item) => {
              const dossier = item.dossiers as { code?: string; title?: string } | null;
              return (
                <Link className="dossierItem" href={`/ho-so/${item.dossier_id}`} key={item.id}>
                  <div>
                    <strong>{item.workflow_key}</strong>
                    <h3>{item.current_step || 'Chưa xác định bước hiện tại'}</h3>
                    <p>{dossier?.code || 'Hồ sơ'} · {dossier?.title || 'Chưa có tên'}</p>
                    <small>Cập nhật {formatDate(item.updated_at)}</small>
                  </div>
                  <div className="dossierMeta"><span className="badge">{item.status}</span></div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
