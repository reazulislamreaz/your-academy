import { UserRole } from './enums';

/**
 * Single source of truth for dashboard RBAC (DEC-048).
 *
 * - Backend: `@RequirePermission(...)` + `PermissionsGuard` enforce these on every
 *   `/api/v1/admin/*` route (and staff-only uploads). Anything unmapped is admin-only.
 * - Frontend: sidebar, route gate, and "Access denied" read the same map (UX only).
 *
 * To add a section: add a key here, grant it to roles below, tag the API routes with
 * `@RequirePermission('<key>')`, and set `permission` on the nav item in `admin-nav.ts`.
 */
export const DASHBOARD_PERMISSIONS = [
  // Moderator content sections
  'preli',
  'written',
  'topic',
  'quiz',
  'modelTest',
  'newspaper',
  /** Shared Preliminary / Written / Topic category trees (all are moderator sections). */
  'categories',
  /** Own Account Settings page — every staff role. */
  'account',
  // Admin-only
  'dashboard',
  'users',
  'activity',
  'audit',
  'examResults',
  'homepage',
  'settings',
  'support',
] as const;

export type DashboardPermission = (typeof DASHBOARD_PERMISSIONS)[number];

/** Roles allowed into the `/admin` dashboard at all. */
export const STAFF_ROLES = [UserRole.ADMIN, UserRole.MODERATOR] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const ROLE_PERMISSIONS: Readonly<Record<UserRole, readonly DashboardPermission[]>> = {
  [UserRole.ADMIN]: DASHBOARD_PERMISSIONS,
  [UserRole.MODERATOR]: [
    'preli',
    'written',
    'topic',
    'quiz',
    'modelTest',
    'newspaper',
    'categories',
    'account',
  ],
  [UserRole.USER]: [],
};

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return role === UserRole.ADMIN || role === UserRole.MODERATOR;
}

export function hasPermission(
  role: string | null | undefined,
  permission: DashboardPermission,
): boolean {
  if (!role || !(role in ROLE_PERMISSIONS)) return false;
  return ROLE_PERMISSIONS[role as UserRole].includes(permission);
}

export function hasAnyPermission(
  role: string | null | undefined,
  permissions: readonly DashboardPermission[],
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export const ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.MODERATOR]: 'Moderator',
  [UserRole.USER]: 'Learner',
};
