import Link from 'next/link';
import { requireUser } from '../../lib/auth/authorization';
import { getEnterpriseDashboard } from '../../lib/data/dashboard';

const dossierLabels: Record<string, string> = {
  draft: 'Bản nháp',
  in_review: 'Đang xem xét',
  approved: 'Đã phê duyệt',
  rejected: 'Bị từ chối',
  archived: 'Đã lưu trữ',
};

const documentLabels: Record<string, string> = {
  draft: 'Bản nháp',
  submitted: 'Đã nộp',
  verified: 'Đã xác minh',
  expired: 'Hết hạn',
  archived: 'Đã lưu trữ',
};

const workflowLabels: Record<string, string> = {
  pending: 'Chờ xử lý',
  active: 'Đang thực hiện',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function StatusGrid({
  values,
  labels,
}: {
  values: Record<string, number>;
  labels: Record<string, string>;
}) {
  const total = Object.values(values).reduce((sum, value) => sum + value, 0);

  return (
    <div className="statusGrid">
      {Object.entries(values).map(([status, count]) => (
        <article className="statusCard" key={status}>
          <strong>{count}</strong>
          <span>{labels[status] ?? status}</span>
          <div className="statusBar">
            <i style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
          </div>
        </article>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();

  if (!user.enterpriseId) {
    return (
      <main className="shell">
        <section className="panel emptyState">
          <div className="eyebrow">HTL HỒ SƠ CHUẨN</div>
          <h1>Chưa xác định doanh nghiệp</h1>
          <p>
            Tài khoản đã đăng nhập nhưng chưa được gắn với doanh nghiệp. Quản trị viên cần hoàn tất cấu hình enterprise_id trước khi sử dụng Dashboard.
          </p>
        </section>
      </main>
    );
  }

  const dashboard = await getEnterpriseDashboard(user.enterpriseId);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <Link className="brand" href="/">HTL HỒ SƠ CHUẨN</Link>
          <div className="tagline">Dashboard doanh nghiệp trên dữ liệu Supabase</div>
        </div>
        <div className="actions">
          <Link className="primary secondary" href="/ho-so">Danh sách hồ sơ</Link>
          <Link className="primary" href="/ho-so">Tạo hồ sơ</Link>
        </div>
      </header>

      <section className="panel dashboardHero">
        <div>
          <div className="eyebrow">TRUNG TÂM ĐIỀU HÀNH</div>
          <h1>Toàn cảnh hồ sơ, tài liệu, thời hạn và quy trình</h1>
          <p className="leadResult muted">
            Số liệu được tổng hợp trực tiếp theo doanh nghiệp hiện tại và chịu kiểm soát bởi Row Level Security.
          </p>
        </div>
        <div className="heroDecision">
          <strong>{dashboard.totals.activeWorkflows}</strong>
          <span>quy trình đang chạy</span>
        </div>
      </section>

      <section className="metricGrid">
        <article className="metricCard"><span>Tổng hồ sơ</span><strong>{dashboard.totals.dossiers}</strong><small>Hồ sơ trong doanh nghiệp</small></article>
        <article className="metricCard"><span>Tổng tài liệu</span><strong>{dashboard.totals.documents}</strong><small>Tài liệu đã ghi nhận</small></article>
        <article className="metricCard"><span>Tổng quy trình</span><strong>{dashboard.totals.workflows}</strong><small>Toàn bộ workflow</small></article>
        <article className="metricCard"><span>Đang thực hiện</span><strong>{dashboard.totals.activeWorkflows}</strong><small>Quy trình cần theo dõi</small></article>
        <article className="metricCard"><span>Đã hoàn thành</span><strong>{dashboard.totals.completedWorkflows}</strong><small>Quy trình đã kết thúc</small></article>
        <article className="metricCard"><span>Sắp hết hạn</span><strong>{dashboard.totals.expiringDocuments}</strong><small>Trong 30 ngày tới</small></article>
        <article className="metricCard"><span>Đã hết hạn</span><strong>{dashboard.totals.expiredDocuments}</strong><small>Cần rà soát ngay</small></article>
      </section>

      <section className="panel">
        <div className="resultHead">
          <div>
            <div className="eyebrow">TRẠNG THÁI HỒ SƠ</div>
            <h2>Phân bố trạng thái quản lý hiện tại</h2>
          </div>
        </div>
        <StatusGrid values={dashboard.dossiersByStatus} labels={dossierLabels} />
      </section>

      <section className="panel">
        <div className="resultHead">
          <div>
            <div className="eyebrow">TRẠNG THÁI TÀI LIỆU</div>
            <h2>Tình trạng xác minh và thời hạn tài liệu</h2>
          </div>
        </div>
        <StatusGrid values={dashboard.documentsByStatus} labels={documentLabels} />
      </section>

      <section className="panel">
        <div className="resultHead">
          <div>
            <div className="eyebrow">TRẠNG THÁI QUY TRÌNH</div>
            <h2>Workflow đang nằm ở trạng thái nào?</h2>
          </div>
        </div>
        <StatusGrid values={dashboard.workflowsByStatus} labels={workflowLabels} />
      </section>

      <section className="twoCols">
        <article className="panel">
          <div className="resultHead">
            <div>
              <div className="eyebrow">CẬP NHẬT GẦN ĐÂY</div>
              <h2>Hồ sơ mới được thay đổi</h2>
            </div>
          </div>
          {!dashboard.recentDossiers.length ? (
            <div className="emptyState">Chưa có hồ sơ trong doanh nghiệp.</div>
          ) : (
            <div className="priorityTable">
              {dashboard.recentDossiers.map((dossier) => (
                <Link className="priorityRow" href={`/ho-so/${dossier.id}`} key={dossier.id}>
                  <span><strong>{dossier.code}</strong><small>{dossier.title}</small></span>
                  <span>{dossierLabels[dossier.status]}</span>
                  <span>{formatDate(dossier.updated_at)}</span>
                </Link>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <div className="resultHead">
            <div>
              <div className="eyebrow">CẢNH BÁO THỜI HẠN</div>
              <h2>Tài liệu sắp hết hạn</h2>
            </div>
          </div>
          {!dashboard.expiringDocuments.length ? (
            <div className="emptyState">Không có tài liệu hết hạn trong 30 ngày tới.</div>
          ) : (
            <div className="priorityTable">
              {dashboard.expiringDocuments.map((document) => (
                <div className="priorityRow" key={document.id}>
                  <span><strong>{document.name}</strong><small>{document.document_type || 'Chưa phân loại'}</small></span>
                  <span>{documentLabels[document.status]}</span>
                  <span>{formatDate(document.expires_at)}</span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="notice">
        Dữ liệu được tổng hợp lúc {formatDate(dashboard.generatedAt)}. Mọi chỉ số đều giới hạn trong doanh nghiệp hiện tại.
      </section>
    </main>
  );
}
