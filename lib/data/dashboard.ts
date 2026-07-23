import { createSupabaseServerClient } from '../supabase/server';
import type { DossierStatus } from './dossiers';
import type { DocumentStatus } from './documents';
import type { WorkflowStatus } from './workflows';

export type StatusCount<T extends string> = Record<T, number>;

export type DashboardRecentDossier = {
  id: string;
  code: string;
  title: string;
  status: DossierStatus;
  updated_at: string;
};

export type ExpiringDocument = {
  id: string;
  dossier_id: string;
  name: string;
  document_type: string | null;
  expires_at: string;
  status: DocumentStatus;
};

export type EnterpriseDashboard = {
  enterpriseId: string;
  generatedAt: string;
  totals: {
    dossiers: number;
    documents: number;
    workflows: number;
    activeWorkflows: number;
    completedWorkflows: number;
    expiringDocuments: number;
    expiredDocuments: number;
  };
  dossiersByStatus: StatusCount<DossierStatus>;
  documentsByStatus: StatusCount<DocumentStatus>;
  workflowsByStatus: StatusCount<WorkflowStatus>;
  recentDossiers: DashboardRecentDossier[];
  expiringDocuments: ExpiringDocument[];
};

const DOSSIER_STATUSES: DossierStatus[] = [
  'draft',
  'in_review',
  'approved',
  'rejected',
  'archived',
];

const DOCUMENT_STATUSES: DocumentStatus[] = [
  'draft',
  'submitted',
  'verified',
  'expired',
  'archived',
];

const WORKFLOW_STATUSES: WorkflowStatus[] = [
  'pending',
  'active',
  'completed',
  'cancelled',
];

function emptyStatusCount<T extends string>(statuses: readonly T[]): Record<T, number> {
  return Object.fromEntries(statuses.map((status) => [status, 0])) as Record<T, number>;
}

function countStatuses<T extends string>(
  rows: Array<{ status: T }> | null,
  statuses: readonly T[],
): Record<T, number> {
  const result = emptyStatusCount(statuses);
  for (const row of rows ?? []) result[row.status] += 1;
  return result;
}

function addDaysIsoDate(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function exactCount(
  table: 'dossiers' | 'dossier_documents' | 'workflow_instances',
  enterpriseId: string,
  filters?: (query: any) => any,
): Promise<number> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('enterprise_id', enterpriseId);

  if (filters) query = filters(query);
  const { count, error } = await query;
  if (error) throw new Error(`Không thể thống kê ${table}: ${error.message}`);
  return count ?? 0;
}

export async function getEnterpriseDashboard(
  enterpriseId: string,
  options?: {
    expiringWithinDays?: number;
    recentLimit?: number;
    expiringLimit?: number;
  },
): Promise<EnterpriseDashboard> {
  const expiringWithinDays = Math.max(1, options?.expiringWithinDays ?? 30);
  const recentLimit = Math.max(1, Math.min(options?.recentLimit ?? 8, 50));
  const expiringLimit = Math.max(1, Math.min(options?.expiringLimit ?? 10, 100));
  const today = new Date().toISOString().slice(0, 10);
  const expiryCutoff = addDaysIsoDate(expiringWithinDays);
  const supabase = await createSupabaseServerClient();

  const [
    totalDossiers,
    totalDocuments,
    totalWorkflows,
    activeWorkflows,
    completedWorkflows,
    expiringDocumentsCount,
    expiredDocumentsCount,
    dossierStatusesResult,
    documentStatusesResult,
    workflowStatusesResult,
    recentDossiersResult,
    expiringDocumentsResult,
  ] = await Promise.all([
    exactCount('dossiers', enterpriseId),
    exactCount('dossier_documents', enterpriseId),
    exactCount('workflow_instances', enterpriseId),
    exactCount('workflow_instances', enterpriseId, (query) => query.eq('status', 'active')),
    exactCount('workflow_instances', enterpriseId, (query) => query.eq('status', 'completed')),
    exactCount('dossier_documents', enterpriseId, (query) =>
      query.gte('expires_at', today).lte('expires_at', expiryCutoff),
    ),
    exactCount('dossier_documents', enterpriseId, (query) =>
      query.lt('expires_at', today),
    ),
    supabase
      .from('dossiers')
      .select('status')
      .eq('enterprise_id', enterpriseId),
    supabase
      .from('dossier_documents')
      .select('status')
      .eq('enterprise_id', enterpriseId),
    supabase
      .from('workflow_instances')
      .select('status')
      .eq('enterprise_id', enterpriseId),
    supabase
      .from('dossiers')
      .select('id, code, title, status, updated_at')
      .eq('enterprise_id', enterpriseId)
      .order('updated_at', { ascending: false })
      .limit(recentLimit),
    supabase
      .from('dossier_documents')
      .select('id, dossier_id, name, document_type, expires_at, status')
      .eq('enterprise_id', enterpriseId)
      .gte('expires_at', today)
      .lte('expires_at', expiryCutoff)
      .order('expires_at', { ascending: true })
      .limit(expiringLimit),
  ]);

  const queryErrors = [
    dossierStatusesResult.error,
    documentStatusesResult.error,
    workflowStatusesResult.error,
    recentDossiersResult.error,
    expiringDocumentsResult.error,
  ].filter(Boolean);

  if (queryErrors.length > 0) {
    throw new Error(`Không thể tải Dashboard: ${queryErrors[0]?.message}`);
  }

  return {
    enterpriseId,
    generatedAt: new Date().toISOString(),
    totals: {
      dossiers: totalDossiers,
      documents: totalDocuments,
      workflows: totalWorkflows,
      activeWorkflows,
      completedWorkflows,
      expiringDocuments: expiringDocumentsCount,
      expiredDocuments: expiredDocumentsCount,
    },
    dossiersByStatus: countStatuses(
      dossierStatusesResult.data as Array<{ status: DossierStatus }> | null,
      DOSSIER_STATUSES,
    ),
    documentsByStatus: countStatuses(
      documentStatusesResult.data as Array<{ status: DocumentStatus }> | null,
      DOCUMENT_STATUSES,
    ),
    workflowsByStatus: countStatuses(
      workflowStatusesResult.data as Array<{ status: WorkflowStatus }> | null,
      WORKFLOW_STATUSES,
    ),
    recentDossiers: (recentDossiersResult.data ?? []) as DashboardRecentDossier[],
    expiringDocuments: (expiringDocumentsResult.data ?? []) as ExpiringDocument[],
  };
}
