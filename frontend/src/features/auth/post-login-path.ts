import type { MeUser } from '@/lib/api/types';
import { resolvePostAuthPath } from '@/lib/auth/role-routing';

/** Safe in-app path after auth. Admins → admin console only; learners → study desk. */
export function postLoginPath(user: Pick<MeUser, 'role'>, next?: string | null): string {
  return resolvePostAuthPath(user.role, next);
}
