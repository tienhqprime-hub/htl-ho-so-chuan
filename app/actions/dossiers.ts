'use server';

import { revalidatePath } from 'next/cache';
import {
  createDossier,
  deleteDossier,
  updateDossier,
  type CreateDossierInput,
  type DossierStatus,
  type UpdateDossierInput,
} from '../../lib/data/dossiers';

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function readRequired(formData: FormData, key: string, label: string): string {
  const value = String(formData.get(key) ?? '').trim();
  if (!value) throw new Error(`${label} không được để trống.`);
  return value;
}

function readOptional(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? '').trim();
  return value || null;
}

function revalidateDossierViews(dossierId?: string): void {
  revalidatePath('/');
  revalidatePath('/dashboard');
  revalidatePath('/dossiers');
  if (dossierId) revalidatePath(`/dossiers/${dossierId}`);
}

export async function createDossierAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const input: CreateDossierInput = {
      enterpriseId: readRequired(formData, 'enterpriseId', 'Doanh nghiệp'),
      code: readRequired(formData, 'code', 'Mã hồ sơ'),
      title: readRequired(formData, 'title', 'Tên hồ sơ'),
      description: readOptional(formData, 'description'),
      category: readOptional(formData, 'category'),
      ownerId: readOptional(formData, 'ownerId'),
      status: (readOptional(formData, 'status') ?? 'draft') as DossierStatus,
    };

    const dossier = await createDossier(input);
    revalidateDossierViews(dossier.id);
    return { ok: true, data: { id: dossier.id } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Không thể tạo hồ sơ.',
    };
  }
}

export async function updateDossierAction(
  dossierId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const input: UpdateDossierInput = {};

    if (formData.has('code')) input.code = readRequired(formData, 'code', 'Mã hồ sơ');
    if (formData.has('title')) input.title = readRequired(formData, 'title', 'Tên hồ sơ');
    if (formData.has('description')) input.description = readOptional(formData, 'description');
    if (formData.has('category')) input.category = readOptional(formData, 'category');
    if (formData.has('ownerId')) input.owner_id = readOptional(formData, 'ownerId');
    if (formData.has('status')) {
      input.status = readRequired(formData, 'status', 'Trạng thái') as DossierStatus;
    }

    await updateDossier(dossierId, input);
    revalidateDossierViews(dossierId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Không thể cập nhật hồ sơ.',
    };
  }
}

export async function changeDossierStatusAction(
  dossierId: string,
  status: DossierStatus,
): Promise<ActionResult> {
  try {
    await updateDossier(dossierId, { status });
    revalidateDossierViews(dossierId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Không thể đổi trạng thái hồ sơ.',
    };
  }
}

export async function deleteDossierAction(
  dossierId: string,
): Promise<ActionResult> {
  try {
    await deleteDossier(dossierId);
    revalidateDossierViews();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Không thể xóa hồ sơ.',
    };
  }
}
