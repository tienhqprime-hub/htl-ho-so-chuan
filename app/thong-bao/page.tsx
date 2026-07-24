import Link from 'next/link';
import { requireUser } from '../../lib/auth/authorization';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import styles from '../dashboard/dashboard.module.css';

type Notice = {
  id: string;
  level: 'urgent' | 'warning' | 'info' | 'done';
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
  time: string;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function daysUntil(value: string): number {
  const target = new Date(value);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

export default async function NotificationsPage() {
  const user = await requireUser();

  if (!user.enterpriseId) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <section className={styles.panel}>
            <h1>Chưa xác định doanh nghiệp</h1>
            <p>Quản trị viên cần gắn tài khoản này với doanh nghiệp trước khi mở Trung tâm thông báo.</p>
          </section>
        </div>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const [documentsResult, workflowsResult, dossiersResult] = await Promise.all([
    supabase
      .from('documents')
      .select('id, dossier_id, name, status, expires_at, updated_at, dossiers(code, title)')
      .eq('enterprise_id', user.enterpriseId)
      .not('expires_at', 'is', null)
      .order('expires_at', { ascending: true }),
    supabase
      .from('workflow_instances')
      .select('id, dossier_id, workflow_key, current_step, status, assigned_to, updated_at, dossiers(code, title)')
      .eq('enterprise_id', user.enterpriseId)
      .in('status', ['pending', 'active'])
      .order('updated_at', { ascending: false }),
    supabase
      .from('dossiers')
      .select('id, code, title, status, updated_at')
      .eq('enterprise_id', user.enterpriseId)
      .in('status', ['rejected', 'in_review'])
      .order('updated_at', { ascending: false }),
  ]);

  const firstError = documentsResult.error || workflowsResult.error || dossiersResult.error;
  if (firstError) throw new Error(`Không thể tải thông báo: ${firstError.message}`);

  const notices: Notice[] = [];

  for (const document of documentsResult.data ?? []) {
    if (!document.expires_at) continue;
    const remaining = daysUntil(document.expires_at);
    if (remaining > 30) continue;
    const dossier = document.dossiers as unknown as { code?: string; title?: string } | null;
    notices.push({
      id: `document-${document.id}`,
      level: remaining < 0 ? 'urgent' : remaining <= 7 ? 'urgent' : 'warning',
      title: remaining < 0
        ? `Tài liệu đã hết hạn ${Math.abs(remaining)} ngày`
        : `Tài liệu còn ${remaining} ngày trước khi hết hạn`,
      detail: `${dossier?.code ?? 'Hồ sơ'} · ${document.name} · ${dossier?.title ?? 'Chưa có tên hồ sơ'}`,
      actionLabel: 'Mở hồ sơ xử lý',
      href: `/ho-so/${document.dossier_id}`,
      time: document.updated_at,
    });
  }

  for (const workflow of workflowsResult.data ?? []) {
    const dossier = workflow.dossiers as unknown as { code?: string; title?: string } | null;
    const assignedToMe = workflow.assigned_to === user.id;
    notices.push({
      id: `workflow-${workflow.id}`,
      level: assignedToMe ? 'urgent' : workflow.status === 'active' ? 'warning' : 'info',
      title: assignedToMe
        ? 'Có công việc đang chờ anh/chị tiếp tục'
        : workflow.status === 'active'
          ? 'Công việc đang dừng giữa quy trình'
          : 'Công việc chưa được bắt đầu',
      detail: `${dossier?.code ?? 'Hồ sơ'} · ${workflow.workflow_key} · Bước: ${workflow.current_step || 'Chưa xác định'}`,
      actionLabel: 'Tiếp tục công việc',
      href: `/ho-so/${workflow.dossier_id}`,
      time: workflow.updated_at,
    });
  }

  for (const dossier of dossiersResult.data ?? []) {
    notices.push({
      id: `dossier-${dossier.id}`,
      level: dossier.status === 'rejected' ? 'urgent' : 'info',
      title: dossier.status === 'rejected'
        ? 'Hồ sơ bị từ chối và cần sửa'
        : 'Hồ sơ đang chờ xem xét',
      detail: `${dossier.code} · ${dossier.title}`,
      actionLabel: dossier.status === 'rejected' ? 'Xem điểm cần sửa' : 'Theo dõi hồ sơ',
      href: `/ho-so/${dossier.id}`,
      time: dossier.updated_at,
    });
  }

  notices.sort((a, b) => {
    const priority = { urgent: 0, warning: 1, info: 2, done: 3 };
    return priority[a.level] - priority[b.level] || new Date(b.time).getTime() - new Date(a.time).getTime();
  });

  const counts = {
    urgent: notices.filter((notice) => notice.level === 'urgent').length,
    warning: notices.filter((notice) => notice.level === 'warning').length,
    info: notices.filter((notice) => notice.level === 'info').length,
    total: notices.length,
  };

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link className={styles.brand} href="/dashboard">
            <span className={styles.mark}>H</span>
            <span><strong>HTL HỒ SƠ CHUẨN</strong><small>Trung tâm thông báo hành động</small></span>
          </Link>
          <nav className={styles.nav}>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/cong-viec">Công việc</Link>
            <Link href="/ho-so">Hồ sơ</Link>
          </nav>
        </header>

        <section className={styles.hero}>
          <article className={styles.heroMain}>
            <div className={styles.eyebrow}>THÔNG BÁO CÓ THỂ HÀNH ĐỘNG</div>
            <h1>Không báo cho biết — báo để người dùng xử lý ngay.</h1>
            <p>Mỗi thông báo nêu rõ việc gì đang có nguy cơ, hồ sơ nào bị ảnh hưởng và mở đúng nơi cần xử lý.</p>
          </article>
          <aside className={styles.heroFocus}>
            <span>CẦN ƯU TIÊN</span>
            <strong>{counts.urgent}</strong>
            <small>việc có nguy cơ gây gián đoạn hoặc tổn thất</small>
          </aside>
        </section>

        <section className={styles.metrics}>
          <article className={styles.metric}><span>Tất cả thông báo</span><strong>{counts.total}</strong><small>đang còn hiệu lực</small></article>
          <article className={styles.metric}><span>Khẩn cấp</span><strong>{counts.urgent}</strong><small>cần xử lý ngay</small></article>
          <article className={styles.metric}><span>Cảnh báo</span><strong>{counts.warning}</strong><small>có thể sớm gây vướng</small></article>
          <article className={styles.metric}><span>Thông tin</span><strong>{counts.info}</strong><small>cần theo dõi</small></article>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div><div className={styles.eyebrow}>ƯU TIÊN THEO MỨC ĐỘ ẢNH HƯỞNG</div><h2>Việc cần biết hôm nay</h2></div>
            <Link href="/cong-viec">Mở Trung tâm công việc</Link>
          </div>

          <div className={styles.recent}>
            {notices.map((notice) => (
              <Link className={styles.recentRow} href={notice.href} key={notice.id}>
                <span>
                  <strong>{notice.title}</strong>
                  <small>{notice.detail} · Cập nhật {formatDate(notice.time)}</small>
                </span>
                <span className={styles.status}>{notice.actionLabel}</span>
              </Link>
            ))}
            {!notices.length && (
              <div className={styles.empty}>Hiện chưa có cảnh báo cần xử lý. Hệ thống sẽ hiển thị tại đây khi tài liệu gần hết hạn, hồ sơ bị từ chối hoặc công việc bị dừng.</div>
            )}
          </div>
        </section>

        <div className={styles.footerNote}>Nguyên tắc HTL: Thông báo phải trả lời đủ ba câu — Có chuyện gì? Ảnh hưởng hồ sơ nào? Mở đâu để xử lý?</div>
      </div>
    </main>
  );
}
