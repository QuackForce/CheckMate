export type Role = 'ADMIN' | 'IT_ENGINEER' | 'IT_MANAGER' | 'CONSULTANT' | 'VIEWER'

// Permission keys used across navigation and dashboard widgets
export type PermissionKey =
  | 'dashboard:view'
  | 'clients:view_all'
  | 'clients:view_own'
  | 'checks:view_all'
  | 'checks:view_own'
  | 'schedule:view'
  | 'team:view'
  | 'org_chart:view'
  | 'org_chart:edit'
  | 'reports:view'
  | 'settings:view'
  | 'settings:edit'
  | 'compliance:manage'

const rolePermissions: Record<Role, Set<PermissionKey>> = {
  ADMIN: new Set<PermissionKey>([
    'dashboard:view',
    'clients:view_all',
    'clients:view_own',
    'checks:view_all',
    'checks:view_own',
    'schedule:view',
    'team:view',
    'org_chart:view',
    'org_chart:edit',
    'reports:view',
    'settings:view',
    'settings:edit',
    'compliance:manage',
  ]),
  IT_MANAGER: new Set<PermissionKey>([
    'dashboard:view',
    'clients:view_all',
    'clients:view_own',
    'checks:view_all',
    'checks:view_own',
    'schedule:view',
    'team:view',
    'org_chart:view',
    'org_chart:edit',
    'reports:view',
    'settings:view',
    'compliance:manage',
    // IT Managers have view-only access to settings (no edit)
  ]),
  IT_ENGINEER: new Set<PermissionKey>([
    'dashboard:view',
    'clients:view_all',
    'clients:view_own',
    'checks:view_all',
    'checks:view_own',
    'schedule:view',
    'team:view',
    'org_chart:view',
    'reports:view',
    'settings:view',
    'settings:edit',
    'compliance:manage',
  ]),
  CONSULTANT: new Set<PermissionKey>([
    'dashboard:view',
    'clients:view_all',
    'clients:view_own',
    'checks:view_all',
    'checks:view_own',
    'org_chart:view',
  ]),
  VIEWER: new Set<PermissionKey>([
    'dashboard:view',
    'clients:view_all',
    'reports:view',
    'org_chart:view',
  ]),
}

export const roleDisplayNames: Record<Role, string> = {
  ADMIN: 'Admin',
  IT_MANAGER: 'IT Manager',
  IT_ENGINEER: 'IT Engineer',
  CONSULTANT: 'Consultant',
  VIEWER: 'Viewer',
}

export function hasPermission(role: Role | string | null | undefined, permission: PermissionKey): boolean {
  if (!role) return false
  const set = rolePermissions[role as Role]
  return !!set && set.has(permission)
}

export function hasAnyPermission(role: Role | string | null | undefined, permissions: PermissionKey[]): boolean {
  return permissions.some((perm) => hasPermission(role, perm))
}

export function hasAnySettingsAccess(role: Role | string | null | undefined): boolean {
  return hasPermission(role, 'settings:view')
}

// Dashboard helpers from the earlier implementation
export function canToggleDashboard(role: Role | string | null | undefined): boolean {
  return role === 'ADMIN' || role === 'IT_MANAGER'
}

export function getDefaultDashboardView(role: Role | string | null | undefined): 'my' | 'team' | 'clients' {
  switch (role) {
    case 'ADMIN':
    case 'IT_MANAGER':
      return 'team'
    case 'CONSULTANT':
      return 'clients'
    default:
      return 'my'
  }
}

export function listPermissionsForRole(role: Role): PermissionKey[] {
  return Array.from(rolePermissions[role] ?? [])
}







