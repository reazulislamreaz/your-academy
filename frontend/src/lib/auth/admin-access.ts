import { hasPermission, type DashboardPermission } from '@your-academy/shared';

/**
 * `/admin/*` route → dashboard permission (DEC-048). Longest prefix wins.
 * Unlisted admin paths are admin-only (fail closed). Kept free of UI imports so
 * middleware (edge) can use it. UX only — the API enforces the same permissions.
 */
export const ADMIN_ROUTE_PERMISSIONS: ReadonlyArray<{
  prefix: string;
  permission: DashboardPermission;
}> = [
  { prefix: '/admin/dashboard', permission: 'dashboard' },
  { prefix: '/admin/support', permission: 'support' },
  { prefix: '/admin/users', permission: 'users' },
  { prefix: '/admin/activity', permission: 'activity' },
  { prefix: '/admin/audit', permission: 'audit' },
  { prefix: '/admin/practice-attempts', permission: 'examResults' },
  { prefix: '/admin/homepage', permission: 'homepage' },
  { prefix: '/admin/social-links', permission: 'settings' },
  // DEC-060 — Free vs Paid system (admin-only)
  { prefix: '/admin/paid-system', permission: 'subscriptions' },
  { prefix: '/admin/packages', permission: 'subscriptions' },
  { prefix: '/admin/pricing-features', permission: 'subscriptions' },
  { prefix: '/admin/subscribers', permission: 'subscriptions' },
  { prefix: '/admin/payments', permission: 'payments' },
  // Moderator content sections
  { prefix: '/admin/questions', permission: 'preli' },
  { prefix: '/admin/question-imports', permission: 'preli' },
  { prefix: '/admin/question-bank-categories', permission: 'preli' },
  { prefix: '/admin/written-question-imports', permission: 'written' },
  { prefix: '/admin/written-bank-categories', permission: 'written' },
  { prefix: '/admin/topic-question-imports', permission: 'topic' },
  { prefix: '/admin/topic-categories', permission: 'topic' },
  { prefix: '/admin/categories', permission: 'categories' },
  { prefix: '/admin/exams', permission: 'quiz' },
  { prefix: '/admin/practice-sets', permission: 'quiz' },
  { prefix: '/admin/model-tests', permission: 'modelTest' },
  { prefix: '/admin/news', permission: 'newspaper' },
  { prefix: '/admin/documents', permission: 'newspaper' },
  { prefix: '/admin/account', permission: 'account' },
];

/** Landing order for staff after login — first allowed entry wins. */
const ADMIN_LANDING_ORDER = [
  '/admin/dashboard',
  '/admin/questions',
  '/admin/written-question-imports',
  '/admin/topic-question-imports',
  '/admin/exams/upload',
  '/admin/model-tests/upload',
  '/admin/documents',
  '/admin/account',
] as const;

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function adminPermissionForPath(pathname: string): DashboardPermission | null {
  let best: { prefix: string; permission: DashboardPermission } | null = null;
  for (const entry of ADMIN_ROUTE_PERMISSIONS) {
    if (matches(pathname, entry.prefix) && (!best || entry.prefix.length > best.prefix.length)) {
      best = entry;
    }
  }
  return best?.permission ?? null;
}

export function canAccessAdminPath(role: string | null | undefined, pathname: string): boolean {
  const permission = adminPermissionForPath(pathname);
  // Unknown admin URLs: admins only.
  return permission ? hasPermission(role, permission) : role === 'ADMIN';
}

export function defaultAdminPathForRole(role: string | null | undefined): string {
  return ADMIN_LANDING_ORDER.find((path) => canAccessAdminPath(role, path)) ?? '/admin/account';
}
