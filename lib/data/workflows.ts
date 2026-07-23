import { createSupabaseServerClient } from '../supabase/server';

export type WorkflowStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'cancelled';

export type WorkflowInstance = {
  id: string;
  enterprise_id: string;
  dossier_id: string;
  workflow_key: string;
  current_step: string | null;
  status: WorkflowStatus;
  assigned_to: string | null;
  started_by: string;
  started_at: string | null;
  completed_at: string | null;
  context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CreateWorkflowInput = {
  enterpriseId: string;
  dossierId: string;
  workflowKey: string;
  currentStep?: string | null;
  assignedTo?: string | null;
  context?: Record<string, unknown>;
  startImmediately?: boolean;
};

export type UpdateWorkflowInput = Partial<
  Pick<
    WorkflowInstance,
    | 'current_step'
    | 'status'
    | 'assigned_to'
    | 'started_at'
    | 'completed_at'
    | 'context'
  >
>;

function normalizeRequired(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} không được để trống.`);
  return normalized;
}

function validateTimeline(
  startedAt?: string | null,
  completedAt?: string | null,
): void {
  if (startedAt && completedAt && completedAt < startedAt) {
    throw new Error('Thời điểm hoàn thành không được trước thời điểm bắt đầu.');
  }
}

export async function listWorkflowsByDossier(
  dossierId: string,
): Promise<WorkflowInstance[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('workflow_instances')
    .select('*')
    .eq('dossier_id', dossierId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`Không thể tải quy trình: ${error.message}`);
  return (data ?? []) as WorkflowInstance[];
}

export async function listAssignedWorkflows(
  userId: string,
): Promise<WorkflowInstance[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('workflow_instances')
    .select('*')
    .eq('assigned_to', userId)
    .in('status', ['pending', 'active'])
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`Không thể tải công việc được giao: ${error.message}`);
  return (data ?? []) as WorkflowInstance[];
}

export async function getWorkflow(
  id: string,
): Promise<WorkflowInstance | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('workflow_instances')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Không thể tải quy trình: ${error.message}`);
  return data as WorkflowInstance | null;
}

export async function createWorkflow(
  input: CreateWorkflowInput,
): Promise<WorkflowInstance> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error('Phiên đăng nhập không hợp lệ.');

  const startImmediately = input.startImmediately ?? true;
  const now = startImmediately ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from('workflow_instances')
    .insert({
      enterprise_id: input.enterpriseId,
      dossier_id: input.dossierId,
      workflow_key: normalizeRequired(input.workflowKey, 'Mã quy trình'),
      current_step: input.currentStep?.trim() || null,
      status: startImmediately ? 'active' : 'pending',
      assigned_to: input.assignedTo ?? null,
      started_by: user.id,
      started_at: now,
      context: input.context ?? {},
    })
    .select('*')
    .single();

  if (error) throw new Error(`Không thể tạo quy trình: ${error.message}`);
  return data as WorkflowInstance;
}

export async function updateWorkflow(
  id: string,
  input: UpdateWorkflowInput,
): Promise<WorkflowInstance> {
  validateTimeline(input.started_at, input.completed_at);

  const payload: UpdateWorkflowInput = { ...input };
  if (typeof payload.current_step === 'string') {
    payload.current_step = payload.current_step.trim() || null;
  }

  if (payload.status === 'active' && payload.started_at === undefined) {
    payload.started_at = new Date().toISOString();
  }
  if (payload.status === 'completed' && payload.completed_at === undefined) {
    payload.completed_at = new Date().toISOString();
  }
  if (payload.status !== undefined && payload.status !== 'completed') {
    payload.completed_at = null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('workflow_instances')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(`Không thể cập nhật quy trình: ${error.message}`);
  return data as WorkflowInstance;
}

export async function assignWorkflow(
  id: string,
  userId: string | null,
): Promise<WorkflowInstance> {
  return updateWorkflow(id, { assigned_to: userId });
}

export async function advanceWorkflow(
  id: string,
  nextStep: string,
  contextPatch?: Record<string, unknown>,
): Promise<WorkflowInstance> {
  const current = await getWorkflow(id);
  if (!current) throw new Error('Không tìm thấy quy trình.');
  if (current.status === 'completed' || current.status === 'cancelled') {
    throw new Error('Quy trình đã kết thúc và không thể chuyển bước.');
  }

  return updateWorkflow(id, {
    current_step: normalizeRequired(nextStep, 'Bước tiếp theo'),
    status: 'active',
    context: { ...current.context, ...(contextPatch ?? {}) },
  });
}

export async function completeWorkflow(
  id: string,
  contextPatch?: Record<string, unknown>,
): Promise<WorkflowInstance> {
  const current = await getWorkflow(id);
  if (!current) throw new Error('Không tìm thấy quy trình.');

  return updateWorkflow(id, {
    status: 'completed',
    context: { ...current.context, ...(contextPatch ?? {}) },
  });
}

export async function cancelWorkflow(id: string): Promise<WorkflowInstance> {
  return updateWorkflow(id, { status: 'cancelled' });
}

export async function deleteWorkflow(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('workflow_instances')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Không thể xóa quy trình: ${error.message}`);
}
