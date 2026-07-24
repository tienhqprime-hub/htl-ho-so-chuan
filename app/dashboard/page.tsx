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
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(value));
}

export default async function DashboardPage() {
  const user = await requireUser();
  if (!user.enterpriseId) {
    return <main className={styles.page}><div className={styles.container}><section className={styles.panel}><div className={styles.eyebrow}>HTL HỒ SƠ CHUẨN</div><h1>Chưa xác định doanh nghiệp</h1><p>Quản trị viên cần gắn tài khoản này với doanh nghiệp trước khi sử dụng hệ thống.</p></section></div></main>;
  }

  const dashboard = await getEnterpriseDashboard(user.enterpriseId);
  const urgent = dashboard.totals.expiredDocuments + dashboard.totals.expiringDocuments + dashboard.dossiersByStatus.rejected;
  const waiting = dashboard.dossiersByStatus.draft + dashboard.dossiersByStatus.in_review;
  const completed = dashboard.dossiersByStatus.approved + dashboard.totals.completedWorkflows;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link className={styles.brand} href="/"><span className={styles.mark}>H</span><span><strong>HTL HỒ SƠ CHUẨN</strong><small>Trung tâm điều hành công việc và hồ sơ</small></span></Link>
          <nav className={styles.nav} aria-label="Điều hướng chính"><Link href="/ho-so">Hồ sơ</Link><Link href="/kiem-tra">Giải quyết việc đang vướng</Link><Link href="/ho-so">Tạo hồ sơ</Link></nav>
        </header>

        <section className={styles.hero}>
          <article className={styles.heroMain}><div className={styles.eyebrow}>VIỆC CẦN BIẾT NGAY</div><h1>Hôm nay cần xử lý việc gì để công việc không bị đình trệ?</h1><p>HTL gom các tín hiệu quan trọng về một nơi: hồ sơ cần xử lý, công việc đang chờ, kết quả đã hoàn thành và rủi ro thời hạn.</p></article>
          <aside className={styles.heroFocus}><span>CẦN XỬ LÝ NGAY</span><strong>{urgent}</strong><small>hạng mục có thể gây chậm việc hoặc phát sinh rủi ro</small></aside>
        </section>

        <section className={styles.metrics} aria-label="Tổng quan công việc">
          <article className={styles.metric}><span>Tổng hồ sơ</span><strong>{dashboard.totals.dossiers}</strong><small>đang được quản lý</small></article>
          <article className={styles.metric}><span>Cần xử lý ngay</span><strong>{urgent}</strong><small>lỗi, từ chối hoặc rủi ro thời hạn</small></article>
          <article className={styles.metric}><span>Đang chờ</span><strong>{waiting}</strong><small>bản nháp hoặc đang xem xét</small></article>
          <article className={styles.metric}><span>Đã hoàn thành</span><strong>{completed}</strong><small>hồ sơ hoặc quy trình đã hoàn tất</small></article>
          <article className={styles.metric}><span>Quá hạn</span><strong>{dashboard.totals.expiredDocuments}</strong><small>tài liệu cần rà soát ngay</small></article>
        </section>

        <section className={styles.workGrid}>
          <article className={styles.panel}>
            <div className={styles.panelHead}><div><div className={styles.eyebrow}>ƯU TIÊN XỬ LÝ</div><h2>Những việc có thể làm công việc bị chậm</h2></div><Link href="/ho-so">Xem toàn bộ</Link></div>
            <div className={styles.priorityList}>
              {dashboard.totals.expiredDocuments > 0 && <div className={styles.priorityItem}><span className={`${styles.dot} ${styles.danger}`} /><span><strong>{dashboard.totals.expiredDocuments} tài liệu đã hết hạn</strong><small>Cần kiểm tra và thay thế trước khi tiếp tục sử dụng.</small></span><Link href="/ho-so">Xử lý</Link></div>}
              {dashboard.expiringDocuments.map((document) => <div className={styles.priorityItem} key={document.id}><span className={styles.dot} /><span><strong>{document.name}</strong><small>Hết hạn ngày {formatDate(document.expires_at)}</small></span><Link href={`/ho-so/${document.dossier_id}`}>Mở hồ sơ</Link></div>)}
              {!dashboard.totals.expiredDocuments && !dashboard.expiringDocuments.length && <div className={styles.empty}>Hiện chưa có tài liệu hết hạn hoặc sắp hết hạn trong 30 ngày tới.</div>}
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHead}><div><div className={styles.eyebrow}>CÔNG VIỆC GẦN ĐÂY</div><h2>Tiếp tục từ đúng nơi đang dở</h2></div></div>
            <div className={styles.recent}>
              {dashboard.recentDossiers.map((dossier) => <Link className={styles.recentRow} href={`/ho-so/${dossier.id}`} key={dossier.id}><span><strong>{dossier.code}</strong><small>{dossier.title} · Cập nhật {formatDate(dossier.updated_at)}</small></span><span className={styles.status}>{dossierLabels[dossier.status] ?? dossier.status}</span></Link>)}
              {!dashboard.recentDossiers.length && <div className={styles.empty}>Chưa có hồ sơ. Hãy tạo hồ sơ đầu tiên hoặc đưa ngay việc đang vướng vào HTL.</div>}
            </div>
          </article>
        </section>

        <div className={styles.footerNote}>Mục tiêu của Dashboard là giúp người dùng biết ngay: việc gì cần làm trước, hồ sơ nào đang chờ và khi nào có thể tiếp tục công việc.</div>
      </div>
    </main>
  );
}
