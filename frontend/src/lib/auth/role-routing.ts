/** Role-aware dashboard routing (UX). API PermissionsGuard remains authz source of truth. */
import { isStaffRole } from '@your-academy/shared';
import { canAccessAdminPath, defaultAdminPathForRole } from './admin-access';

export type AppRole = 'ADMIN' | 'MODERATOR' | 'USER';

export function toAppRole(role: string | null | undefined): AppRole | null {
  return role === 'ADMIN' || role === 'MODERATOR' || role === 'USER' ? role : null;
}

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
  '/live-model-tests',
  '/live-quizzes',
  '/exam-tracks',
  '/previous-year',
  '/preliminary',
  '/preli-questions',
  '/preli-practice',
  '/written',
  '/topics',
] as const;

/** Public marketing surfaces — never soft-gated by auth middleware. */
export const PUBLIC_MARKETING_PREFIXES = [
  '/',
  '/preli-question-bank',
  '/written-question-bank',
  '/news',
  '/exams',
  '/model-test',
  '/topic-base',
  '/topic-categories',
  '/question-bank-categories',
  '/written-question-bank-categories',
  '/privacy-policy',
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
  return isStaffRole(role) ? defaultAdminPathForRole(role) : '/home';
}

/**
 * Safe in-app destination after login / session restore.
 * Staff (Admin / Moderator) stay in `/admin/*` sections their role allows;
 * learners never enter `/admin/*`.
 */
export function resolvePostAuthPath(
  role: AppRole | string | null | undefined,
  next?: string | null,
): string {
  const normalized = toAppRole(role);
  const fallback = defaultPathForRole(normalized);

  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return fallback;
  }

  if (isStaffRole(normalized)) {
    // Staff must not land on learner dashboards or admin sections outside their role.
    return isAdminAppPath(next) && canAccessAdminPath(normalized, next) ? next : fallback;
  }

  if (isAdminAppPath(next)) {
    return '/home';
  }

  return next;
}
