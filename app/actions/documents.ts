'use server';

import { revalidatePath } from 'next/cache';
import {
  createDocument,
  deleteDocument,
  updateDocument,
  type CreateDocumentInput,
  type DocumentStatus,
  type UpdateDocumentInput,
} from '../../lib/data/documents';
import type { ActionResult } from './dossiers';

function readRequired(formData: FormData, key: string, label: string): string {
  const value = String(formData.get(key) ?? '').trim();
  if (!value) throw new Error(`${label} không được để trống.`);
  return value;
}

function readOptional(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? '').trim();
  return value || null;
}

function readOptionalNumber(formData: FormData, key: string): number | null {
  const raw = readOptional(formData, key);
  if (raw === null) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${key} không hợp lệ.`);
  return value;
}

function readMetadata(formData: FormData): Record<string, unknown> {
  const raw = readOptional(formData, 'metadata');
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new Error();
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error('Metadata phải là JSON hợp lệ.');
  }
}

function revalidateDocumentViews(dossierId?: string, documentId?: string): void {
  revalidatePath('/');
  revalidatePath('/dashboard');
  revalidatePath('/documents');
  revalidatePath('/dossiers');
  if (dossierId) revalidatePath(`/dossiers/${dossierId}`);
  if (documentId) revalidatePath(`/documents/${documentId}`);
}

export async function createDocumentAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const dossierId = readRequired(formData, 'dossierId', 'Hồ sơ');
    const input: CreateDocumentInput = {
      enterpriseId: readRequired(formData, 'enterpriseId', 'Doanh nghiệp'),
      dossierId,
      name: readRequired(formData, 'name', 'Tên tài liệu'),
      documentType: readOptional(formData, 'documentType'),
      storagePath: readOptional(formData, 'storagePath'),
      mimeType: readOptional(formData, 'mimeType'),
      fileSize: readOptionalNumber(formData, 'fileSize'),
      version: readOptionalNumber(formData, 'version') ?? 1,
      status: (readOptional(formData, 'status') ?? 'draft') as DocumentStatus,
      issuedAt: readOptional(formData, 'issuedAt'),
      expiresAt: readOptional(formData, 'expiresAt'),
      metadata: readMetadata(formData),
    };

    const document = await createDocument(input);
    revalidateDocumentViews(dossierId, document.id);
    return { ok: true, data: { id: document.id } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Không thể tạo tài liệu.',
    };
  }
}

export async function updateDocumentAction(
  documentId: string,
  dossierId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const input: UpdateDocumentInput = {};

    if (formData.has('name')) input.name = readRequired(formData, 'name', 'Tên tài liệu');
    if (formData.has('documentType')) input.document_type = readOptional(formData, 'documentType');
    if (formData.has('storagePath')) input.storage_path = readOptional(formData, 'storagePath');
    if (formData.has('mimeType')) input.mime_type = readOptional(formData, 'mimeType');
    if (formData.has('fileSize')) input.file_size = readOptionalNumber(formData, 'fileSize');
    if (formData.has('version')) input.version = readOptionalNumber(formData, 'version') ?? 1;
    if (formData.has('status')) {
      input.status = readRequired(formData, 'status', 'Trạng thái') as DocumentStatus;
    }
    if (formData.has('issuedAt')) input.issued_at = readOptional(formData, 'issuedAt');
    if (formData.has('expiresAt')) input.expires_at = readOptional(formData, 'expiresAt');
    if (formData.has('metadata')) input.metadata = readMetadata(formData);

    await updateDocument(documentId, input);
    revalidateDocumentViews(dossierId, documentId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Không thể cập nhật tài liệu.',
    };
  }
}

export async function changeDocumentStatusAction(
  documentId: string,
  dossierId: string,
  status: DocumentStatus,
): Promise<ActionResult> {
  try {
    await updateDocument(documentId, { status });
    revalidateDocumentViews(dossierId, documentId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Không thể đổi trạng thái tài liệu.',
    };
  }
}

export async function deleteDocumentAction(
  documentId: string,
  dossierId: string,
): Promise<ActionResult> {
  try {
    await deleteDocument(documentId);
    revalidateDocumentViews(dossierId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Không thể xóa tài liệu.',
    };
  }
}
