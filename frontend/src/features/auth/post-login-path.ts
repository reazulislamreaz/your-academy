import type { MeUser } from '@/lib/api/types';

/** Safe in-app path after auth. Admins default to admin console; learners to study desk. */
export function postLoginPath(user: Pick<MeUser, 'role'>, next?: string | null): string {
  const fallback = user.role === 'ADMIN' ? '/admin/dashboard' : '/home';
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return fallback;
  }
  // Non-admins must never be sent into /admin/* via ?next=
  if (user.role !== 'ADMIN' && (next === '/admin' || next.startsWith('/admin/'))) {
    return '/home';
  }
  return next;
}
