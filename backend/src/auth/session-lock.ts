import type { Prisma } from '@prisma/client';

export const SESSION_REPLACED_MESSAGE =
  'Your account was signed in on another device, so you have been signed out here.';

/**
 * Transaction-scoped Postgres advisory lock keyed on the user id. Logins and refresh
 * rotations for one user run one at a time, so "newest login wins" holds under races.
 */
export async function lockUserSessions(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))) AS l`;
}
