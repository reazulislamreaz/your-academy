import type { TimedAttemptSummary } from '@your-academy/shared';
import { apiFetch } from './client';

export function listMyTimedAttempts(limit = 40): Promise<TimedAttemptSummary[]> {
  const sp = new URLSearchParams({ limit: String(limit) });
  return apiFetch<TimedAttemptSummary[]>(`/me/timed-attempts?${sp.toString()}`);
}

export function claimTimedAttempt(body: {
  kind: 'exam' | 'model-test';
  attemptId: string;
}): Promise<{ ok: boolean; alreadyLinked: boolean }> {
  return apiFetch<{ ok: boolean; alreadyLinked: boolean }>('/me/timed-attempts/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
