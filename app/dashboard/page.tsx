import Link from 'next/link';
import { requireUser } from '../../lib/auth/authorization';
import { getEnterpriseDashboard } from '../../lib/data/dashboard';
import styles from './dashboard.module.css';

const dossierLabels: Record<string, string> = {
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

export default async function DashboardPage() {
  const user = await requireUser();

  if (!user.enterpriseId) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <section className={styles.panel}>
            <div className={styles.eyebrow}>HTL HỒ SƠ CHUẨN</div>
            <h1>Chưa xác định doanh nghiệp</h1>
            <p>
              Tài khoản đã đăng nhập nhưng chưa được gắn với doanh nghiệp. Quản trị viên cần hoàn tất cấu hình trước khi sử dụng hệ thống.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const dashboard = await getEnterpriseDashboard(user.enterpriseId);
  const priorityCount = dashboard.totals.expiredDocuments + dashboard.totals.expiringDocuments + dashboard.totals.activeWorkflows;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link className={styles.brand} href="/">
            <span className={styles.mark}>H</span>
            <span>
              <strong>HTL HỒ SƠ CHUẨN</strong>
              <small>Trung tâm điều hành hồ sơ</small>
            </span>
          </Link>
          <nav className={styles.nav} aria-label="Điều hướng chính">
            <Link href="/ho-so">Danh sách hồ sơ</Link>
            <Link href="/kiem-tra">Kiểm tra tài liệu</Link>
            <Link href="/ho-so">Tạo hồ sơ</Link>
          </nav>
        </header>

        <section className={styles.hero}>
          <article className={styles.heroMain}>
            <div className={styles.eyebrow}>VIỆC CẦN BIẾT NGAY</div>
            <h1>Hồ sơ nào cần xử lý và bước tiếp theo là gì?</h1>
            <p>
              Dashboard chỉ hiển thị các thông tin giúp người dùng hành động: hồ sơ đang có, tài liệu có rủi ro thời hạn và quy trình còn dang dở.
            </p>
          </article>
          <aside className={styles.heroFocus}>
            <span>CẦN QUAN TÂM</span>
            <strong>{priorityCount}</strong>
            <small>hạng mục cần theo dõi hoặc xử lý</small>
          </aside>
        </section>

        <section className={styles.metrics} aria-label="Chỉ số chính">
          <article className={styles.metric}>
            <span>Hồ sơ</span>
            <strong>{dashboard.totals.dossiers}</strong>
            <small>đang được quản lý</small>
          </article>
          <article className={styles.metric}>
            <span>Tài liệu</span>
            <strong>{dashboard.totals.documents}</strong>
            <small>đã ghi nhận</small>
          </article>
          <article className={styles.metric}>
            <span>Quy trình đang chạy</span>
            <strong>{dashboard.totals.activeWorkflows}</strong>
            <small>cần tiếp tục xử lý</small>
          </article>
          <article className={styles.metric}>
            <span>Rủi ro thời hạn</span>
            <strong>{dashboard.totals.expiredDocuments + dashboard.totals.expiringDocuments}</strong>
            <small>hết hạn hoặc sắp hết hạn</small>
          </article>
        </section>

        <section className={styles.workGrid}>
          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <div className={styles.eyebrow}>ƯU TIÊN XỬ LÝ</div>
                <h2>Tài liệu có rủi ro thời hạn</h2>
              </div>
              <Link href="/ho-so">Xem hồ sơ</Link>
            </div>

            <div className={styles.priorityList}>
              {dashboard.totals.expiredDocuments > 0 && (
                <div className={styles.priorityItem}>
                  <span className={`${styles.dot} ${styles.danger}`} />
                  <span>
                    <strong>{dashboard.totals.expiredDocuments} tài liệu đã hết hạn</strong>
                    <small>Cần rà soát và thay thế ngay.</small>
                  </span>
                  <Link href="/ho-so">Xử lý</Link>
                </div>
              )}

              {dashboard.expiringDocuments.map((document) => (
                <div className={styles.priorityItem} key={document.id}>
                  <span className={styles.dot} />
                  <span>
                    <strong>{document.name}</strong>
                    <small>Hết hạn ngày {formatDate(document.expires_at)}</small>
                  </span>
                  <Link href="/ho-so">Kiểm tra</Link>
                </div>
              ))}

              {!dashboard.totals.expiredDocuments && !dashboard.expiringDocuments.length && (
                <div className={styles.empty}>Không có tài liệu hết hạn hoặc sắp hết hạn trong 30 ngày tới.</div>
              )}
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <div className={styles.eyebrow}>HỒ SƠ GẦN ĐÂY</div>
                <h2>Tiếp tục công việc</h2>
              </div>
            </div>

            <div className={styles.recent}>
              {dashboard.recentDossiers.map((dossier) => (
                <Link className={styles.recentRow} href={`/ho-so/${dossier.id}`} key={dossier.id}>
                  <span>
                    <strong>{dossier.code}</strong>
                    <small>{dossier.title} · Cập nhật {formatDate(dossier.updated_at)}</small>
                  </span>
                  <span className={styles.status}>{dossierLabels[dossier.status] ?? dossier.status}</span>
                </Link>
              ))}

              {!dashboard.recentDossiers.length && (
                <div className={styles.empty}>Chưa có hồ sơ. Hãy tạo hồ sơ đầu tiên để bắt đầu quy trình kiểm tra.</div>
              )}
            </div>
          </article>
        </section>

        <div className={styles.footerNote}>
          HTL hỗ trợ phát hiện vấn đề và cung cấp căn cứ để người dùng xem xét. Quyết định cuối cùng luôn thuộc về người có trách nhiệm.
        </div>
      </div>
    </main>
  );
}
