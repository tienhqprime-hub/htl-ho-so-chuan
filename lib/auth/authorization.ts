import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../supabase/server';

export const USER_ROLES = ['system_admin', 'enterprise_admin', 'user'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  role: UserRole;
  enterpriseId: string | null;
};

function normalizeRole(value: unknown): UserRole {
  return USER_ROLES.includes(value as UserRole) ? (value as UserRole) : 'user';
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const metadata = user.app_metadata ?? {};

  return {
    id: user.id,
    email: user.email ?? null,
    role: normalizeRole(metadata.role),
    enterpriseId:
      typeof metadata.enterprise_id === 'string' ? metadata.enterprise_id : null,
  };
}

export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/dang-nhap');
  }

  return user;
}

export async function requireRole(
  allowedRoles: readonly UserRole[],
): Promise<AuthenticatedUser> {
  const user = await requireUser();

  if (!allowedRoles.includes(user.role)) {
    redirect('/khong-co-quyen');
  }

  return user;
}

export async function requireEnterpriseAccess(
  enterpriseId: string,
): Promise<AuthenticatedUser> {
  const user = await requireUser();

  const canAccess =
    user.role === 'system_admin' ||
    (Boolean(user.enterpriseId) && user.enterpriseId === enterpriseId);

  if (!canAccess) {
    redirect('/khong-co-quyen');
  }

  return user;
}
