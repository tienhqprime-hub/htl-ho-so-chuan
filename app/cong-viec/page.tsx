import Link from 'next/link';
import { requireUser } from '../../lib/auth/authorization';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import styles from '../dashboard/dashboard.module.css';

type WorkStatus = 'pending' | 'active' | 'completed' | 'cancelled';

type WorkItem = {
  id: string;
  dossier_id: string;
  workflow_key: string;
  current_step: string | null;
  status: WorkStatus;
  assigned_to: string | null;
  updated_at: string;
  dossiers: { code: string; title: string } | null;
};

const statusLabel: Record<WorkStatus, string> = {
  pending: 'Chờ bắt đầu',
  active: 'Đang xử lý',
  completed: 'Đã hoàn thành',
  cancelled: 'Đã dừng',
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

export default async function WorkCenterPage({
  searchParams,
}: {
  searchParams?: { q?: string; status?: string };
}) {
  const user = await requireUser();
  if (!user.enterpriseId) {
    return <main className={styles.page}><div className={styles.container}><section className={styles.panel}><h1>Chưa xác định doanh nghiệp</h1><p>Quản trị viên cần gắn tài khoản này với doanh nghiệp trước khi mở Trung tâm công việc.</p></section></div></main>;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('workflow_instances')
    .select('id, dossier_id, workflow_key, current_step, status, assigned_to, updated_at, dossiers(code, title)')
    .eq('enterprise_id', user.enterpriseId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`Không thể tải Trung tâm công việc: ${error.message}`);

  const allItems = (data ?? []) as unknown as WorkItem[];
  const query = String(searchParams?.q ?? '').trim().toLowerCase();
  const selectedStatus = String(searchParams?.status ?? 'open');
  const items = allItems.filter((item) => {
    const text = `${item.workflow_key} ${item.current_step ?? ''} ${item.dossiers?.code ?? ''} ${item.dossiers?.title ?? ''}`.toLowerCase();
    const matchesText = !query || text.includes(query);
    const matchesStatus = selectedStatus === 'all'
      || (selectedStatus === 'open' && ['pending', 'active'].includes(item.status))
      || item.status === selectedStatus;
    return matchesText && matchesStatus;
  });

  const totals = {
    urgent: allItems.filter((item) => item.status === 'active').length,
    waiting: allItems.filter((item) => item.status === 'pending').length,
    completed: allItems.filter((item) => item.status === 'completed').length,
    all: allItems.length,
  };

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link className={styles.brand} href="/dashboard"><span className={styles.mark}>H</span><span><strong>HTL HỒ SƠ CHUẨN</strong><small>Trung tâm công việc một cửa</small></span></Link>
          <nav className={styles.nav}><Link href="/dashboard">Dashboard</Link><Link href="/ho-so">Hồ sơ</Link><Link href="/kiem-tra">Giải quyết việc đang vướng</Link></nav>
        </header>

        <section className={styles.hero}>
          <article className={styles.heroMain}><div className={styles.eyebrow}>TRUNG TÂM CÔNG VIỆC</div><h1>Mọi việc đang vướng được tập trung tại một nơi.</h1><p>Người dùng nhìn thấy công việc nào đang chờ, đang xử lý ở bước nào, thuộc hồ sơ nào và cần mở đâu để tiếp tục — không phải đi tìm trong nhiều màn hình.</p></article>
          <aside className={styles.heroFocus}><span>ĐANG CẦN TIẾP TỤC</span><strong>{totals.urgent + totals.waiting}</strong><small>công việc đang hoạt động hoặc chờ bắt đầu</small></aside>
        </section>

        <section className={styles.metrics}>
          <article className={styles.metric}><span>Tất cả công việc</span><strong>{totals.all}</strong><small>đã ghi nhận</small></article>
          <article className={styles.metric}><span>Đang xử lý</span><strong>{totals.urgent}</strong><small>cần tiếp tục ngay</small></article>
          <article className={styles.metric}><span>Đang chờ</span><strong>{totals.waiting}</strong><small>chưa bắt đầu</small></article>
          <article className={styles.metric}><span>Đã hoàn thành</span><strong>{totals.completed}</strong><small>đã có kết quả</small></article>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}><div><div className={styles.eyebrow}>TÌM VÀ TIẾP TỤC CÔNG VIỆC</div><h2>Danh sách công việc</h2></div><Link href="/kiem-tra">+ Giải quyết việc mới</Link></div>
          <form method="get" className="dossierToolbar">
            <input name="q" defaultValue={searchParams?.q ?? ''} placeholder="Tìm theo hồ sơ, công việc hoặc bước đang làm..." />
            <select name="status" defaultValue={selectedStatus}>
              <option value="open">Việc chưa xong</option>
              <option value="all">Tất cả</option>
              <option value="active">Đang xử lý</option>
              <option value="pending">Đang chờ</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="cancelled">Đã dừng</option>
            </select>
            <button className="primary secondary" type="submit">Tìm công việc</button>
          </form>

          <div className={styles.recent}>
            {items.map((item) => (
              <Link className={styles.recentRow} href={`/ho-so/${item.dossier_id}`} key={item.id}>
                <span>
                  <strong>{item.dossiers?.code ?? 'Hồ sơ'} · {item.workflow_key}</strong>
                  <small>{item.dossiers?.title ?? 'Chưa có tên hồ sơ'} · Bước hiện tại: {item.current_step || 'Chưa xác định'} · Cập nhật {formatDate(item.updated_at)}</small>
                </span>
                <span className={styles.status}>{statusLabel[item.status]}</span>
              </Link>
            ))}
            {!items.length && <div className={styles.empty}>Không có công việc phù hợp. Người dùng có thể mở một hồ sơ hoặc đưa việc đang vướng vào HTL để bắt đầu.</div>}
          </div>
        </section>

        <div className={styles.footerNote}>Dòng chảy một cửa: Nhận việc → xác định hồ sơ → biết bước đang vướng → mở đúng nơi xử lý → ghi nhận kết quả.</div>
      </div>
    </main>
  );
}
