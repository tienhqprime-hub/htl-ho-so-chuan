'use server';

import { revalidatePath } from 'next/cache';
import {
  advanceWorkflow,
  assignWorkflow,
  cancelWorkflow,
  completeWorkflow,
  createWorkflow,
  deleteWorkflow,
  updateWorkflow,
  type CreateWorkflowInput,
  type UpdateWorkflowInput,
  type WorkflowStatus,
} from '../../lib/data/workflows';
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

function readBoolean(formData: FormData, key: string, fallback = false): boolean {
  if (!formData.has(key)) return fallback;
  const value = String(formData.get(key) ?? '').toLowerCase();
  return ['1', 'true', 'on', 'yes'].includes(value);
}

function readContext(formData: FormData, key = 'context'): Record<string, unknown> {
  const raw = readOptional(formData, key);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error();
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error('Dữ liệu ngữ cảnh phải là JSON hợp lệ.');
  }
}

function revalidateWorkflowViews(dossierId?: string, workflowId?: string): void {
  revalidatePath('/');
  revalidatePath('/dashboard');
  revalidatePath('/workflows');
  revalidatePath('/dossiers');
  if (dossierId) revalidatePath(`/dossiers/${dossierId}`);
  if (workflowId) revalidatePath(`/workflows/${workflowId}`);
}

export async function createWorkflowAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const dossierId = readRequired(formData, 'dossierId', 'Hồ sơ');
    const input: CreateWorkflowInput = {
      enterpriseId: readRequired(formData, 'enterpriseId', 'Doanh nghiệp'),
      dossierId,
      workflowKey: readRequired(formData, 'workflowKey', 'Mã quy trình'),
      currentStep: readOptional(formData, 'currentStep'),
      assignedTo: readOptional(formData, 'assignedTo'),
      context: readContext(formData),
      startImmediately: readBoolean(formData, 'startImmediately', true),
    };

    const workflow = await createWorkflow(input);
    revalidateWorkflowViews(dossierId, workflow.id);
    return { ok: true, data: { id: workflow.id } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Không thể tạo quy trình.',
    };
  }
}

export async function updateWorkflowAction(
  workflowId: string,
  dossierId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const input: UpdateWorkflowInput = {};

    if (formData.has('currentStep')) input.current_step = readOptional(formData, 'currentStep');
    if (formData.has('assignedTo')) input.assigned_to = readOptional(formData, 'assignedTo');
    if (formData.has('status')) {
      input.status = readRequired(formData, 'status', 'Trạng thái') as WorkflowStatus;
    }
    if (formData.has('startedAt')) input.started_at = readOptional(formData, 'startedAt');
    if (formData.has('completedAt')) input.completed_at = readOptional(formData, 'completedAt');
    if (formData.has('context')) input.context = readContext(formData);

    await updateWorkflow(workflowId, input);
    revalidateWorkflowViews(dossierId, workflowId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Không thể cập nhật quy trình.',
    };
  }
}

export async function assignWorkflowAction(
  workflowId: string,
  dossierId: string,
  assignedTo: string | null,
): Promise<ActionResult> {
  try {
    await assignWorkflow(workflowId, assignedTo?.trim() || null);
    revalidateWorkflowViews(dossierId, workflowId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Không thể phân công quy trình.',
    };
  }
}

export async function advanceWorkflowAction(
  workflowId: string,
  dossierId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const nextStep = readRequired(formData, 'nextStep', 'Bước tiếp theo');
    const contextPatch = readContext(formData, 'contextPatch');
    await advanceWorkflow(workflowId, nextStep, contextPatch);
    revalidateWorkflowViews(dossierId, workflowId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Không thể chuyển bước quy trình.',
    };
  }
}

export async function completeWorkflowAction(
  workflowId: string,
  dossierId: string,
  contextPatch?: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    await completeWorkflow(workflowId, contextPatch);
    revalidateWorkflowViews(dossierId, workflowId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Không thể hoàn tất quy trình.',
    };
  }
}

export async function cancelWorkflowAction(
  workflowId: string,
  dossierId: string,
): Promise<ActionResult> {
  try {
    await cancelWorkflow(workflowId);
    revalidateWorkflowViews(dossierId, workflowId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Không thể hủy quy trình.',
    };
  }
}

export async function deleteWorkflowAction(
  workflowId: string,
  dossierId: string,
): Promise<ActionResult> {
  try {
    await deleteWorkflow(workflowId);
    revalidateWorkflowViews(dossierId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Không thể xóa quy trình.',
    };
  }
}
