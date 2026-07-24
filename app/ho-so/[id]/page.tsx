import Link from 'next/link';
import { notFound } from 'next/navigation';
import { uploadDocumentAction } from '../../actions/documents';
import { requireEnterpriseAccess } from '../../../lib/auth/authorization';
import { getDossier, type DossierStatus } from '../../../lib/data/dossiers';
import {
  listDocumentsByDossier,
  type DocumentStatus,
} from '../../../lib/data/documents';
import { listWorkflowsByDossier, type WorkflowStatus } from '../../../lib/data/workflows';

const dossierStatusLabels: Record<DossierStatus, string> = {
  draft: 'Bản nháp',
  in_review: 'Đang xem xét',
  approved: 'Đã phê duyệt',
  rejected: 'Bị từ chối',
  archived: 'Đã lưu trữ',
};

const documentStatusLabels: Record<DocumentStatus, string> = {
  draft: 'Bản nháp',
  submitted: 'Đã nộp',
  verified: 'Đã xác minh',
  expired: 'Hết hạn',
  archived: 'Đã lưu trữ',
};

const workflowStatusLabels: Record<WorkflowStatus, string> = {
  pending: 'Chờ bắt đầu',
  active: 'Đang xử lý',
  completed: 'Đã hoàn thành',
  cancelled: 'Đã dừng',
};

function formatDate(value: string | null, includeTime = false): string {
  if (!value) return 'Chưa thiết lập';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value));
}

function formatSize(value: number | null): string {
  if (value == null) return 'Chưa có tệp';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

type TimelineEvent = {
  id: string;
  time: string;
  title: string;
  detail: string;
  state: 'done' | 'active' | 'warning' | 'neutral';
};

export default async function DossierDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const dossier = await getDossier(params.id);
  if (!dossier) notFound();

  await requireEnterpriseAccess(dossier.enterprise_id);
  const [documents, workflows] = await Promise.all([
    listDocumentsByDossier(dossier.id),
    listWorkflowsByDossier(dossier.id),
  ]);

  const timeline: TimelineEvent[] = [
    {
      id: `dossier-${dossier.id}`,
      time: dossier.created_at,
      title: 'Hồ sơ được tạo',
      detail: `${dossier.code} · ${dossier.title}`,
      state: 'done',
    },
    ...documents.map((document) => ({
      id: `document-${document.id}`,
      time: document.created_at,
      title: 'Tài liệu được đưa vào hồ sơ',
      detail: `${document.name} · ${document.document_type || 'Chưa phân loại'} · ${documentStatusLabels[document.status]}`,
      state: document.status === 'expired' ? 'warning' as const : 'done' as const,
    })),
    ...workflows.map((workflow) => ({
      id: `workflow-${workflow.id}`,
      time: workflow.updated_at,
      title: workflow.status === 'completed' ? 'Công việc đã hoàn thành' : 'Công việc được cập nhật',
      detail: `${workflow.workflow_key} · Bước hiện tại: ${workflow.current_step || 'Chưa xác định'} · ${workflowStatusLabels[workflow.status]}`,
      state: workflow.status === 'completed'
        ? 'done' as const
        : workflow.status === 'active'
          ? 'active' as const
          : workflow.status === 'cancelled'
            ? 'warning' as const
            : 'neutral' as const,
    })),
    ...(dossier.updated_at !== dossier.created_at ? [{
      id: `updated-${dossier.id}`,
      time: dossier.updated_at,
      title: 'Thông tin hồ sơ được cập nhật',
      detail: `Trạng thái hiện tại: ${dossierStatusLabels[dossier.status]}`,
      state: dossier.status === 'rejected' ? 'warning' as const : dossier.status === 'approved' ? 'done' as const : 'active' as const,
    }] : []),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const activeWorkflow = workflows.find((workflow) => workflow.status === 'active' || workflow.status === 'pending');
  const nextAction = activeWorkflow
    ? `Tiếp tục công việc “${activeWorkflow.workflow_key}” tại bước “${activeWorkflow.current_step || 'xác định bước tiếp theo'}”.`
    : dossier.status === 'approved'
      ? 'Hồ sơ đã được phê duyệt. Có thể tiếp tục công việc nghiệp vụ liên quan.'
      : documents.length
        ? 'Kiểm tra tài liệu để xác định lỗi, căn cứ và bước xử lý tiếp theo.'
        : 'Tải tài liệu đầu tiên lên hồ sơ để bắt đầu kiểm tra.';

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <Link className="brand" href="/dashboard">HTL HỒ SƠ CHUẨN</Link>
          <div className="tagline">Một cửa: hồ sơ · tài liệu · công việc · kết quả</div>
        </div>
        <div className="actions">
          <Link className="primary secondary" href="/cong-viec">Trung tâm công việc</Link>
          <Link className="primary secondary" href="/ho-so">Danh sách hồ sơ</Link>
          <Link
            className="primary"
            href={`/kiem-tra?dossierId=${dossier.id}&code=${encodeURIComponent(dossier.code)}&name=${encodeURIComponent(dossier.title)}`}
          >
            Kiểm tra tài liệu
          </Link>
        </div>
      </header>

      <section className="panel">
        <div className="eyebrow">HỒ SƠ {dossier.code}</div>
        <div className="resultHead">
          <div>
            <h1>{dossier.title}</h1>
            <p className="muted">{dossier.description || 'Chưa có mô tả chi tiết.'}</p>
          </div>
          <div className="score">
            <strong>{documents.length}</strong>
            <span>Tài liệu</span>
          </div>
        </div>

        <div className="dossierToolbar">
          <div><strong>Trạng thái:</strong> {dossierStatusLabels[dossier.status]}</div>
          <div><strong>Phân loại:</strong> {dossier.category || 'Chưa phân loại'}</div>
          <div><strong>Ngày tạo:</strong> {formatDate(dossier.created_at)}</div>
          <div><strong>Cập nhật:</strong> {formatDate(dossier.updated_at)}</div>
        </div>
      </section>

      <section className="panel">
        <div className="eyebrow">BƯỚC TIẾP THEO</div>
        <h2>Người dùng cần làm gì ngay bây giờ?</h2>
        <div className="emptyState"><strong>{nextAction}</strong></div>
      </section>

      <section className="panel">
        <div className="eyebrow">DÒNG ĐỜI HỒ SƠ</div>
        <h2>Toàn bộ diễn biến theo thời gian</h2>
        <p className="muted">Mỗi sự kiện cho biết hồ sơ đã đi qua đâu, đang dừng ở bước nào và kết quả gần nhất là gì.</p>
        <div className="dossierList">
          {timeline.map((event, index) => (
            <article className="dossierItem" key={event.id}>
              <div>
                <strong>{index === 0 ? 'MỚI NHẤT' : `BƯỚC ${timeline.length - index}`}</strong>
                <h3>{event.title}</h3>
                <p>{event.detail}</p>
                <small>{formatDate(event.time, true)}</small>
              </div>
              <div className="dossierMeta">
                <span className="badge">
                  {event.state === 'done' ? 'Đã ghi nhận' : event.state === 'active' ? 'Đang diễn ra' : event.state === 'warning' ? 'Cần chú ý' : 'Đang chờ'}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="eyebrow">TẢI TÀI LIỆU LÊN</div>
        <h2>Thêm tệp thật vào hồ sơ</h2>
        <p className="muted">Hệ thống nhận PDF, Word, Excel, JPG và PNG; dung lượng tối đa 20 MB. Tệp được lưu riêng theo doanh nghiệp và hồ sơ.</p>
        <form className="dossierForm" action={uploadDocumentAction} encType="multipart/form-data">
          <input name="enterpriseId" type="hidden" value={dossier.enterprise_id} />
          <input name="dossierId" type="hidden" value={dossier.id} />
          <input name="name" placeholder="Tên hiển thị (để trống sẽ dùng tên tệp)" />
          <input name="documentType" placeholder="Loại tài liệu" />
          <input name="issuedAt" type="date" aria-label="Ngày cấp" />
          <input name="expiresAt" type="date" aria-label="Ngày hết hạn" />
          <input name="file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" required />
          <button className="primary" type="submit">Tải lên hồ sơ</button>
        </form>
      </section>

      <section className="panel">
        <div className="eyebrow">TÀI LIỆU THUỘC HỒ SƠ</div>
        <h2>Danh sách tài liệu</h2>
        <div className="dossierList">
          {!documents.length && <div className="emptyState">Hồ sơ này chưa có tài liệu. Hãy tải tài liệu đầu tiên ở biểu mẫu phía trên.</div>}
          {documents.map((document) => (
            <article className="dossierItem" key={document.id}>
              <div>
                <strong>{document.document_type || 'Tài liệu chưa phân loại'}</strong>
                <h3>{document.name}</h3>
                <p>Phiên bản {document.version} · {formatSize(document.file_size)} · Ngày cấp {formatDate(document.issued_at)}</p>
                <small>Hết hạn: {formatDate(document.expires_at)}</small>
              </div>
              <div className="dossierMeta">
                <span className="badge">{documentStatusLabels[document.status]}</span>
                <small>Cập nhật {formatDate(document.updated_at)}</small>
                <span className="primary secondary dossierAction">{document.storage_path ? 'Đã lưu Storage' : 'Chưa có tệp'}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
