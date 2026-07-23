import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createDocumentAction } from '../../actions/documents';
import { requireEnterpriseAccess } from '../../../lib/auth/authorization';
import { getDossier, type DossierStatus } from '../../../lib/data/dossiers';
import {
  listDocumentsByDossier,
  type DocumentStatus,
} from '../../../lib/data/documents';

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

function formatDate(value: string | null): string {
  if (!value) return 'Chưa thiết lập';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function formatSize(value: number | null): string {
  if (value == null) return 'Chưa có tệp';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DossierDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const dossier = await getDossier(params.id);
  if (!dossier) notFound();

  await requireEnterpriseAccess(dossier.enterprise_id);
  const documents = await listDocumentsByDossier(dossier.id);

  async function createDocument(formData: FormData): Promise<void> {
    'use server';
    await createDocumentAction(formData);
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <Link className="brand" href="/">HTL HỒ SƠ CHUẨN</Link>
          <div className="tagline">Chi tiết hồ sơ và tài liệu doanh nghiệp</div>
        </div>
        <div className="actions">
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
        <div className="eyebrow">THÊM TÀI LIỆU</div>
        <h2>Khai báo tài liệu trong hồ sơ</h2>
        <p className="muted">
          Bước này tạo bản ghi tài liệu trên Supabase. Upload tệp vào Storage sẽ được nối ở bước kế tiếp.
        </p>

        <form className="dossierForm" action={createDocument}>
          <input name="enterpriseId" type="hidden" value={dossier.enterprise_id} />
          <input name="dossierId" type="hidden" value={dossier.id} />
          <input name="status" type="hidden" value="draft" />
          <input name="version" type="hidden" value="1" />
          <input name="name" placeholder="Tên tài liệu *" required />
          <input name="documentType" placeholder="Loại tài liệu" />
          <input name="issuedAt" type="date" aria-label="Ngày cấp" />
          <input name="expiresAt" type="date" aria-label="Ngày hết hạn" />
          <button className="primary" type="submit">Thêm tài liệu</button>
        </form>
      </section>

      <section className="panel">
        <div className="eyebrow">TÀI LIỆU THUỘC HỒ SƠ</div>
        <h2>Danh sách tài liệu</h2>

        <div className="dossierList">
          {!documents.length && (
            <div className="emptyState">
              Hồ sơ này chưa có tài liệu. Hãy thêm tài liệu đầu tiên ở biểu mẫu phía trên.
            </div>
          )}

          {documents.map((document) => (
            <article className="dossierItem" key={document.id}>
              <div>
                <strong>{document.document_type || 'Tài liệu chưa phân loại'}</strong>
                <h3>{document.name}</h3>
                <p>
                  Phiên bản {document.version} · {formatSize(document.file_size)} · Ngày cấp {formatDate(document.issued_at)}
                </p>
                <small>Hết hạn: {formatDate(document.expires_at)}</small>
              </div>
              <div className="dossierMeta">
                <span className="badge">{documentStatusLabels[document.status]}</span>
                <small>Cập nhật {formatDate(document.updated_at)}</small>
                {document.storage_path ? (
                  <span className="primary secondary dossierAction">Đã có tệp</span>
                ) : (
                  <span className="primary secondary dossierAction">Chưa upload tệp</span>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
