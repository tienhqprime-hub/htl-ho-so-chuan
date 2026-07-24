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

function daysUntil(value: string | null): number | null {
  if (!value) return null;
  const target = new Date(value);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

type TimelineEvent = {
  id: string;
  time: string;
  title: string;
  detail: string;
  state: 'done' | 'active' | 'warning' | 'neutral';
};

type OperationalIssue = {
  id: string;
  severity: 'critical' | 'warning' | 'attention';
  title: string;
  why: string;
  impact: string;
  action: string;
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

  const issues: OperationalIssue[] = [];

  if (!documents.length) {
    issues.push({
      id: 'missing-documents',
      severity: 'critical',
      title: 'Hồ sơ chưa có tài liệu để kiểm tra',
      why: 'Không có dữ liệu đầu vào nên hệ thống chưa thể đối chiếu nội dung, thời hạn hoặc tính đầy đủ.',
      impact: 'Hồ sơ chưa đủ điều kiện để tiếp tục bước kiểm tra nghiệp vụ.',
      action: 'Tải tài liệu đầu tiên lên hồ sơ và chạy kiểm tra.',
    });
  }

  for (const document of documents) {
    const remaining = daysUntil(document.expires_at);
    if (document.status === 'expired' || (remaining != null && remaining < 0)) {
      issues.push({
        id: `expired-${document.id}`,
        severity: 'critical',
        title: `Tài liệu “${document.name}” đã hết hạn`,
        why: `Ngày hết hạn đã qua ${Math.abs(remaining ?? 0)} ngày.`,
        impact: 'Có thể làm hồ sơ bị từ chối, gián đoạn xử lý hoặc phát sinh chi phí bổ sung.',
        action: 'Thay bằng tài liệu còn hiệu lực và kiểm tra lại toàn bộ hồ sơ.',
      });
    } else if (remaining != null && remaining <= 30) {
      issues.push({
        id: `expiring-${document.id}`,
        severity: remaining <= 7 ? 'critical' : 'warning',
        title: `Tài liệu “${document.name}” sắp hết hạn`,
        why: `Chỉ còn ${remaining} ngày hiệu lực.`,
        impact: 'Hồ sơ có thể trở nên không hợp lệ nếu xử lý kéo dài qua thời hạn.',
        action: 'Chuẩn bị gia hạn hoặc thay tài liệu trước khi tiếp tục công việc.',
      });
    }

    if (!document.document_type) {
      issues.push({
        id: `unclassified-${document.id}`,
        severity: 'attention',
        title: `Tài liệu “${document.name}” chưa được phân loại`,
        why: 'Thiếu loại tài liệu khiến việc áp quy tắc kiểm tra và đối chiếu bị hạn chế.',
        impact: 'Có nguy cơ bỏ sót yêu cầu bắt buộc hoặc áp sai tiêu chí kiểm tra.',
        action: 'Xác định đúng loại tài liệu trước khi chạy kiểm tra chuyên sâu.',
      });
    }
  }

  for (const workflow of workflows) {
    if (workflow.status === 'cancelled') {
      issues.push({
        id: `cancelled-${workflow.id}`,
        severity: 'warning',
        title: `Quy trình “${workflow.workflow_key}” đã bị dừng`,
        why: `Quy trình dừng tại bước “${workflow.current_step || 'chưa xác định'}”.`,
        impact: 'Hồ sơ không thể đi tiếp nếu chưa xác định nguyên nhân và người xử lý.',
        action: 'Mở Trung tâm công việc, xác định lý do dừng và khởi động lại luồng phù hợp.',
      });
    }
  }

  if (dossier.status === 'rejected') {
    issues.unshift({
      id: 'dossier-rejected',
      severity: 'critical',
      title: 'Hồ sơ đang ở trạng thái bị từ chối',
      why: 'Kết quả hiện tại cho thấy hồ sơ chưa đáp ứng yêu cầu phê duyệt.',
      impact: 'Không nên tiếp tục các bước nghiệp vụ phụ thuộc vào hồ sơ này.',
      action: 'Xem các điểm cần sửa, cập nhật tài liệu và gửi kiểm tra lại.',
    });
  }

  const activeWorkflow = workflows.find((workflow) => workflow.status === 'active' || workflow.status === 'pending');
  const nextAction = issues.length
    ? issues[0].action
    : activeWorkflow
      ? `Tiếp tục công việc “${activeWorkflow.workflow_key}” tại bước “${activeWorkflow.current_step || 'xác định bước tiếp theo'}”.`
      : dossier.status === 'approved'
        ? 'Hồ sơ đã được phê duyệt. Có thể tiếp tục công việc nghiệp vụ liên quan.'
        : documents.length
          ? 'Chạy kiểm tra tài liệu để xác nhận hồ sơ đã sẵn sàng.'
          : 'Tải tài liệu đầu tiên lên hồ sơ để bắt đầu kiểm tra.';

  const verifiedDocuments = documents.filter((document) => document.status === 'verified').length;
  const completedWorkflows = workflows.filter((workflow) => workflow.status === 'completed').length;
  const criticalIssues = issues.filter((issue) => issue.severity === 'critical').length;
  const warningIssues = issues.filter((issue) => issue.severity === 'warning').length;
  const baseScore = documents.length ? 55 : 20;
  const healthScore = Math.max(0, Math.min(100,
    baseScore
      + verifiedDocuments * 8
      + completedWorkflows * 5
      + (dossier.status === 'approved' ? 25 : 0)
      - criticalIssues * 20
      - warningIssues * 8,
  ));
  const canContinue = criticalIssues === 0 && dossier.status !== 'rejected';

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <Link className="brand" href="/dashboard">HTL HỒ SƠ CHUẨN</Link>
          <div className="tagline">Buồng điều khiển: biết sai ở đâu · vì sao · làm gì tiếp</div>
        </div>
        <div className="actions">
          <Link className="primary secondary" href="/thong-bao">Thông báo</Link>
          <Link className="primary secondary" href="/cong-viec">Công việc</Link>
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
            <strong>{healthScore}</strong>
            <span>Sức khỏe hồ sơ</span>
          </div>
        </div>

        <div className="dossierToolbar">
          <div><strong>Trạng thái:</strong> {dossierStatusLabels[dossier.status]}</div>
          <div><strong>Phân loại:</strong> {dossier.category || 'Chưa phân loại'}</div>
          <div><strong>Tài liệu:</strong> {documents.length}</div>
          <div><strong>Vấn đề:</strong> {issues.length}</div>
          <div><strong>Có thể đi tiếp:</strong> {canContinue ? 'Có' : 'Chưa'}</div>
          <div><strong>Cập nhật:</strong> {formatDate(dossier.updated_at)}</div>
        </div>
      </section>

      <section className="panel">
        <div className="eyebrow">KẾT LUẬN ĐIỀU HÀNH</div>
        <h2>{canContinue ? 'Hồ sơ chưa có điểm chặn nghiêm trọng' : 'Chưa nên tiếp tục hồ sơ này'}</h2>
        <div className="emptyState">
          <strong>{nextAction}</strong>
          <p>{canContinue
            ? 'Người dùng có thể tiếp tục, nhưng vẫn cần xử lý các cảnh báo còn lại theo thứ tự ưu tiên.'
            : 'Hãy xử lý điểm chặn đầu tiên trước; sau đó chạy kiểm tra lại để xác nhận hồ sơ đã an toàn.'}</p>
        </div>
      </section>

      <section className="panel">
        <div className="eyebrow">ĐIỂM SAI VÀ RỦI RO</div>
        <h2>Ở đâu sai, vì sao và phải làm gì tiếp?</h2>
        <div className="dossierList">
          {!issues.length && <div className="emptyState">Chưa phát hiện điểm chặn từ dữ liệu hiện có. Hãy chạy kiểm tra tài liệu để phân tích nội dung sâu hơn.</div>}
          {issues.map((issue, index) => (
            <article className="dossierItem" key={issue.id}>
              <div>
                <strong>{index + 1}. {issue.severity === 'critical' ? 'NGHIÊM TRỌNG' : issue.severity === 'warning' ? 'CẢNH BÁO' : 'CẦN HOÀN THIỆN'}</strong>
                <h3>{issue.title}</h3>
                <p><strong>Vì sao:</strong> {issue.why}</p>
                <p><strong>Ảnh hưởng:</strong> {issue.impact}</p>
                <p><strong>Cách xử lý:</strong> {issue.action}</p>
              </div>
              <div className="dossierMeta">
                <span className="badge">{issue.severity === 'critical' ? 'Xử lý ngay' : issue.severity === 'warning' ? 'Ưu tiên sớm' : 'Cần bổ sung'}</span>
              </div>
            </article>
          ))}
        </div>
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
