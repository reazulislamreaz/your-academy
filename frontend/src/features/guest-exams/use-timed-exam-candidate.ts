'use client';

import { useMe } from '@/features/auth/use-auth';

/**
 * Auth-aware candidate name for public Quiz / Model Test players (DEC-045).
 * Logged-in users skip the name modal and use their account display name.
 */
export function useTimedExamCandidate() {
  const me = useMe();
  const accountName = me.data?.name?.trim() ?? '';
  const isAuthenticated = Boolean(me.data);
  const authReady = !me.isLoading;
  const canAutoStart = authReady && accountName.length >= 2;

  return {
    me,
    accountName,
    isAuthenticated,
    authReady,
    canAutoStart,
    /** Show name gate only for guests (or auth users without a usable name). */
    shouldPromptName: authReady && !canAutoStart,
  };
}
