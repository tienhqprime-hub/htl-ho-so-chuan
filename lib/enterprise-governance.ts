export type EnterpriseRole = 'Quản trị hệ thống' | 'Lãnh đạo' | 'Chuyên viên' | 'Kiểm soát' | 'Chỉ xem';

export type EnterprisePermission =
  | 'organization.manage'
  | 'member.manage'
  | 'dossier.create'
  | 'dossier.edit'
  | 'dossier.verify'
  | 'dossier.approve'
  | 'dossier.close'
  | 'report.view'
  | 'report.export'
  | 'audit.view';

export type EnterpriseOrganization = {
  id: string;
  code: string;
  name: string;
  status: 'Hoạt động' | 'Tạm dừng';
  createdAt: string;
};

export type EnterpriseMember = {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: EnterpriseRole;
  status: 'Đang hoạt động' | 'Đã khóa';
  createdAt: string;
};

export type AuditAction =
  | 'Tạo tổ chức'
  | 'Cập nhật tổ chức'
  | 'Thêm thành viên'
  | 'Đổi vai trò'
  | 'Khóa thành viên'
  | 'Mở khóa thành viên'
  | 'Xem báo cáo'
  | 'Xuất báo cáo'
  | 'Thay đổi hồ sơ'
  | 'Phê duyệt hồ sơ';

export type AuditEvent = {
  id: string;
  organizationId: string;
  actor: string;
  actorRole: EnterpriseRole;
  action: AuditAction;
  targetType: 'Tổ chức' | 'Thành viên' | 'Hồ sơ' | 'Báo cáo';
  targetId: string;
  description: string;
  createdAt: string;
};

export const ENTERPRISE_ORGANIZATIONS_KEY = 'htl-enterprise-organizations-v1';
export const ENTERPRISE_MEMBERS_KEY = 'htl-enterprise-members-v1';
export const ENTERPRISE_AUDIT_KEY = 'htl-enterprise-audit-v1';

export const ROLE_PERMISSIONS: Record<EnterpriseRole, EnterprisePermission[]> = {
  'Quản trị hệ thống': [
    'organization.manage',
    'member.manage',
    'dossier.create',
    'dossier.edit',
    'dossier.verify',
    'dossier.approve',
    'dossier.close',
    'report.view',
    'report.export',
    'audit.view',
  ],
  'Lãnh đạo': [
    'dossier.create',
    'dossier.edit',
    'dossier.verify',
    'dossier.approve',
    'dossier.close',
    'report.view',
    'report.export',
    'audit.view',
  ],
  'Chuyên viên': [
    'dossier.create',
    'dossier.edit',
    'dossier.verify',
    'report.view',
  ],
  'Kiểm soát': [
    'dossier.verify',
    'dossier.approve',
    'report.view',
    'report.export',
    'audit.view',
  ],
  'Chỉ xem': ['report.view'],
};

const DEFAULT_ORGANIZATION: EnterpriseOrganization = {
  id: 'htl-default-organization',
  code: 'HTL-001',
  name: 'Doanh nghiệp mẫu HTL',
  status: 'Hoạt động',
  createdAt: new Date().toISOString(),
};

const DEFAULT_MEMBERS: EnterpriseMember[] = [
  {
    id: 'htl-admin',
    organizationId: DEFAULT_ORGANIZATION.id,
    name: 'Quản trị HTL',
    email: 'admin@htl.local',
    role: 'Quản trị hệ thống',
    status: 'Đang hoạt động',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'htl-leader',
    organizationId: DEFAULT_ORGANIZATION.id,
    name: 'Lãnh đạo doanh nghiệp',
    email: 'leader@htl.local',
    role: 'Lãnh đạo',
    status: 'Đang hoạt động',
    createdAt: new Date().toISOString(),
  },
];

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function ensureEnterpriseSeed() {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem(ENTERPRISE_ORGANIZATIONS_KEY)) {
    safeWrite(ENTERPRISE_ORGANIZATIONS_KEY, [DEFAULT_ORGANIZATION]);
  }
  if (!localStorage.getItem(ENTERPRISE_MEMBERS_KEY)) {
    safeWrite(ENTERPRISE_MEMBERS_KEY, DEFAULT_MEMBERS);
  }
  if (!localStorage.getItem(ENTERPRISE_AUDIT_KEY)) {
    safeWrite(ENTERPRISE_AUDIT_KEY, [] as AuditEvent[]);
  }
}

export function readOrganizations(): EnterpriseOrganization[] {
  ensureEnterpriseSeed();
  return safeRead(ENTERPRISE_ORGANIZATIONS_KEY, [DEFAULT_ORGANIZATION]);
}

export function writeOrganizations(items: EnterpriseOrganization[]) {
  safeWrite(ENTERPRISE_ORGANIZATIONS_KEY, items);
}

export function readEnterpriseMembers(): EnterpriseMember[] {
  ensureEnterpriseSeed();
  return safeRead(ENTERPRISE_MEMBERS_KEY, DEFAULT_MEMBERS);
}

export function writeEnterpriseMembers(items: EnterpriseMember[]) {
  safeWrite(ENTERPRISE_MEMBERS_KEY, items);
}

export function readAuditEvents(): AuditEvent[] {
  ensureEnterpriseSeed();
  return safeRead(ENTERPRISE_AUDIT_KEY, [] as AuditEvent[]);
}

export function appendAuditEvent(event: Omit<AuditEvent, 'id' | 'createdAt'>) {
  const created: AuditEvent = {
    ...event,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  safeWrite(ENTERPRISE_AUDIT_KEY, [created, ...readAuditEvents()].slice(0, 500));
  return created;
}

export function hasPermission(role: EnterpriseRole, permission: EnterprisePermission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function getRolePermissionSummary(role: EnterpriseRole) {
  const permissions = ROLE_PERMISSIONS[role];
  return {
    role,
    total: permissions.length,
    canManageOrganization: permissions.includes('organization.manage'),
    canManageMembers: permissions.includes('member.manage'),
    canApprove: permissions.includes('dossier.approve'),
    canExport: permissions.includes('report.export'),
    canViewAudit: permissions.includes('audit.view'),
  };
}
