import { createSupabaseServerClient } from '../supabase/server';

export type DocumentStatus =
  | 'draft'
  | 'submitted'
  | 'verified'
  | 'expired'
  | 'archived';

const DOCUMENT_STATUSES = new Set<DocumentStatus>([
  'draft',
  'submitted',
  'verified',
  'expired',
  'archived',
]);

export type DossierDocument = {
  id: string;
  enterprise_id: string;
  dossier_id: string;
  name: string;
  document_type: string | null;
  storage_path: string | null;
  mime_type: string | null;
  file_size: number | null;
  version: number;
  status: DocumentStatus;
  issued_at: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown>;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
};

export type CreateDocumentInput = {
  enterpriseId: string;
  dossierId: string;
  name: string;
  documentType?: string | null;
  storagePath?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  version?: number;
  status?: DocumentStatus;
  issuedAt?: string | null;
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
};

export type UpdateDocumentInput = Partial<
  Pick<
    DossierDocument,
    | 'name'
    | 'document_type'
    | 'storage_path'
    | 'mime_type'
    | 'file_size'
    | 'version'
    | 'status'
    | 'issued_at'
    | 'expires_at'
    | 'metadata'
  >
>;

function normalizeRequired(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} không được để trống.`);
  return normalized;
}

function validateDates(issuedAt?: string | null, expiresAt?: string | null): void {
  if (issuedAt && expiresAt && expiresAt < issuedAt) {
    throw new Error('Ngày hết hạn không được trước ngày cấp.');
  }
}

function validateVersion(version: number | undefined): void {
  if (version != null && (!Number.isInteger(version) || version < 1)) {
    throw new Error('Phiên bản tài liệu phải là số nguyên lớn hơn 0.');
  }
}

function validateFileSize(fileSize: number | null | undefined): void {
  if (fileSize != null && (!Number.isFinite(fileSize) || fileSize < 0)) {
    throw new Error('Kích thước tệp không hợp lệ.');
  }
}

function validateStatus(status: DocumentStatus | undefined): void {
  if (status && !DOCUMENT_STATUSES.has(status)) {
    throw new Error('Trạng thái tài liệu không hợp lệ.');
  }
}

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42P01'
    || error.code === 'PGRST205'
    || Boolean(error.message?.toLowerCase().includes('dossier_documents'));
}

export async function listDocumentsByDossier(
  dossierId: string,
): Promise<DossierDocument[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('dossier_documents')
    .select('*')
    .eq('dossier_id', dossierId)
    .order('updated_at', { ascending: false });

  if (isMissingTableError(error)) return [];
  if (error) throw new Error(`Không thể tải tài liệu: ${error.message}`);
  return (data ?? []) as DossierDocument[];
}

export async function getDocument(id: string): Promise<DossierDocument | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('dossier_documents')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Không thể tải tài liệu: ${error.message}`);
  return data as DossierDocument | null;
}

export async function createDocument(
  input: CreateDocumentInput,
): Promise<DossierDocument> {
  validateDates(input.issuedAt, input.expiresAt);
  validateFileSize(input.fileSize);
  validateVersion(input.version);
  validateStatus(input.status);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error('Phiên đăng nhập không hợp lệ.');

  const { data, error } = await supabase
    .from('dossier_documents')
    .insert({
      enterprise_id: input.enterpriseId,
      dossier_id: input.dossierId,
      name: normalizeRequired(input.name, 'Tên tài liệu'),
      document_type: input.documentType?.trim() || null,
      storage_path: input.storagePath?.trim() || null,
      mime_type: input.mimeType?.trim() || null,
      file_size: input.fileSize ?? null,
      version: input.version ?? 1,
      status: input.status ?? 'draft',
      issued_at: input.issuedAt ?? null,
      expires_at: input.expiresAt ?? null,
      metadata: input.metadata ?? {},
      uploaded_by: user.id,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Không thể tạo tài liệu: ${error.message}`);
  return data as DossierDocument;
}

export async function updateDocument(
  id: string,
  input: UpdateDocumentInput,
): Promise<DossierDocument> {
  validateFileSize(input.file_size);
  validateVersion(input.version);
  validateStatus(input.status);

  const supabase = await createSupabaseServerClient();
  const { data: current, error: currentError } = await supabase
    .from('dossier_documents')
    .select('issued_at, expires_at')
    .eq('id', id)
    .maybeSingle();

  if (currentError) throw new Error(`Không thể kiểm tra tài liệu: ${currentError.message}`);
  if (!current) throw new Error('Không tìm thấy tài liệu cần cập nhật.');

  validateDates(
    input.issued_at !== undefined ? input.issued_at : current.issued_at,
    input.expires_at !== undefined ? input.expires_at : current.expires_at,
  );

  const payload: UpdateDocumentInput = { ...input };
  if (typeof payload.name === 'string') {
    payload.name = normalizeRequired(payload.name, 'Tên tài liệu');
  }
  if (typeof payload.document_type === 'string') {
    payload.document_type = payload.document_type.trim() || null;
  }
  if (typeof payload.storage_path === 'string') {
    payload.storage_path = payload.storage_path.trim() || null;
  }
  if (typeof payload.mime_type === 'string') {
    payload.mime_type = payload.mime_type.trim() || null;
  }

  const { data, error } = await supabase
    .from('dossier_documents')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(`Không thể cập nhật tài liệu: ${error.message}`);
  return data as DossierDocument;
}

export async function deleteDocument(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('dossier_documents')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Không thể xóa tài liệu: ${error.message}`);
}
