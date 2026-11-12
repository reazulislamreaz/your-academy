/** Role-aware dashboard routing (UX). API RolesGuard remains authz source of truth. */

export type AppRole = 'ADMIN' | 'USER';

/** Authenticated learner / student app shells under `(app)`. */
export const LEARNER_APP_PREFIXES = [
  '/home',
  '/onboarding',
  '/questions',
  '/bookmarks',
  '/documents',
  '/profile',
  '/practice',
  '/results',
  '/subjects',
  '/quizzes',
  '/daily-quiz',
  '/model-tests',
  '/exams',
  '/previous-year',
] as const;

/** Public marketing surfaces — never soft-gated by auth middleware. */
export const PUBLIC_MARKETING_PREFIXES = [
  '/',
  '/preli-question-bank',
  '/written-question-bank',
  '/news',
] as const;

export function isPublicMarketingPath(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_MARKETING_PREFIXES.filter((p) => p !== '/').some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAdminAppPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export function isLearnerAppPath(pathname: string): boolean {
  return LEARNER_APP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function defaultPathForRole(role: AppRole | string | null | undefined): string {
  return role === 'ADMIN' ? '/admin/dashboard' : '/home';
}

/**
 * Safe in-app destination after login / session restore.
 * Admins stay in `/admin/*`; learners never enter `/admin/*`.
 */
export function resolvePostAuthPath(
  role: AppRole | string | null | undefined,
  next?: string | null,
): string {
  const normalized: AppRole | null = role === 'ADMIN' ? 'ADMIN' : role === 'USER' ? 'USER' : null;
  const fallback = defaultPathForRole(normalized);

  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return fallback;
  }

  if (normalized === 'ADMIN') {
    if (isAdminAppPath(next)) return next;
    // Admins must not land on learner dashboards via ?next=
    return '/admin/dashboard';
  }

  if (isAdminAppPath(next)) {
    return '/home';
  }

  return next;
}
