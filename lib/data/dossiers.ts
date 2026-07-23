import { createSupabaseServerClient } from '../supabase/server';

export type DossierStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'archived';

export type Dossier = {
  id: string;
  enterprise_id: string;
  code: string;
  title: string;
  description: string | null;
  category: string | null;
  status: DossierStatus;
  owner_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CreateDossierInput = {
  enterpriseId: string;
  code: string;
  title: string;
  description?: string | null;
  category?: string | null;
  ownerId?: string | null;
  status?: DossierStatus;
};

export type UpdateDossierInput = Partial<
  Pick<Dossier, 'code' | 'title' | 'description' | 'category' | 'status' | 'owner_id'>
>;

function normalizeText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} không được để trống.`);
  return normalized;
}

export async function listDossiers(enterpriseId: string): Promise<Dossier[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('dossiers')
    .select('*')
    .eq('enterprise_id', enterpriseId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`Không thể tải danh sách hồ sơ: ${error.message}`);
  return (data ?? []) as Dossier[];
}

export async function getDossier(id: string): Promise<Dossier | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('dossiers')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Không thể tải hồ sơ: ${error.message}`);
  return data as Dossier | null;
}

export async function createDossier(
  input: CreateDossierInput,
): Promise<Dossier> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error('Phiên đăng nhập không hợp lệ.');

  const { data, error } = await supabase
    .from('dossiers')
    .insert({
      enterprise_id: input.enterpriseId,
      code: normalizeText(input.code, 'Mã hồ sơ'),
      title: normalizeText(input.title, 'Tên hồ sơ'),
      description: input.description?.trim() || null,
      category: input.category?.trim() || null,
      status: input.status ?? 'draft',
      owner_id: input.ownerId ?? user.id,
      created_by: user.id,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Không thể tạo hồ sơ: ${error.message}`);
  return data as Dossier;
}

export async function updateDossier(
  id: string,
  input: UpdateDossierInput,
): Promise<Dossier> {
  const supabase = await createSupabaseServerClient();
  const payload: UpdateDossierInput = { ...input };

  if (typeof payload.code === 'string') {
    payload.code = normalizeText(payload.code, 'Mã hồ sơ');
  }
  if (typeof payload.title === 'string') {
    payload.title = normalizeText(payload.title, 'Tên hồ sơ');
  }
  if (typeof payload.description === 'string') {
    payload.description = payload.description.trim() || null;
  }
  if (typeof payload.category === 'string') {
    payload.category = payload.category.trim() || null;
  }

  const { data, error } = await supabase
    .from('dossiers')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(`Không thể cập nhật hồ sơ: ${error.message}`);
  return data as Dossier;
}

export async function deleteDossier(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('dossiers').delete().eq('id', id);

  if (error) throw new Error(`Không thể xóa hồ sơ: ${error.message}`);
}
