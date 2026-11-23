'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { TimedAttemptSummary } from '@your-academy/shared';
import { useMe } from '@/features/auth/use-auth';
import { loadGuestExamSession } from '@/features/guest-exams/exam-session';
import { loadModelTestSession } from '@/features/model-tests/model-test-session';
import { apiFetch } from '@/lib/api/client';
import { listMyTimedAttempts } from '@/lib/api/timed-attempts';
import type { PracticeAttemptSummary } from '@/lib/api/types';
import type { ExamCardStatus } from './exam-card';

/** Max the `/me/*-attempts` endpoints accept — enough to cover a learner's recent history. */
const HISTORY_LIMIT = 100;

/**
 * Card status for public Quiz / Model Test listings:
 * - Completed + latest score from `GET /me/timed-attempts` (signed-in only).
 * - In progress from this tab's saved sheet (sessionStorage), for anyone.
 */
export function useTimedExamStatus(
  kind: 'exam' | 'model-test',
  ids: string[],
): (item: { id: string; slug: string }) => ExamCardStatus {
  const me = useMe();
  const history = useQuery({
    queryKey: ['timed-attempts', 'status', HISTORY_LIMIT],
    queryFn: () => listMyTimedAttempts(HISTORY_LIMIT),
    enabled: Boolean(me.data),
    refetchOnMount: 'always',
    retry: false,
  });

  const idsKey = ids.join(',');
  const [inProgress, setInProgress] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    const load = kind === 'exam' ? loadGuestExamSession : loadModelTestSession;
    setInProgress(new Set(idsKey ? idsKey.split(',').filter((id) => load(id) != null) : []));
  }, [idsKey, kind]);

  const latestBySlug = useMemo(() => {
    const map = new Map<string, { latest: TimedAttemptSummary; count: number }>();
    // API returns newest first.
    for (const attempt of history.data ?? []) {
      if (attempt.kind !== kind) continue;
      const entry = map.get(attempt.slug);
      if (entry) entry.count += 1;
      else map.set(attempt.slug, { latest: attempt, count: 1 });
    }
    return map;
  }, [history.data, kind]);

  return (item) => {
    if (inProgress.has(item.id)) return { state: 'in-progress' };
    const done = latestBySlug.get(item.slug);
    if (done) {
      return {
        state: 'completed',
        percent: done.latest.percent,
        resultHref: done.latest.resultPath,
        attempts: done.count,
      };
    }
    return { state: 'not-started' };
  };
}

/**
 * Card status for authenticated practice sets from `GET /me/practice-attempts`
 * (submitted / expired attempts only — the API does not list in-progress ones).
 */
export function usePracticeSetStatus(): (setId: string) => ExamCardStatus {
  const history = useQuery({
    queryKey: ['practice-attempts', 'status', HISTORY_LIMIT],
    queryFn: () =>
      apiFetch<PracticeAttemptSummary[]>(`/me/practice-attempts?limit=${HISTORY_LIMIT}`),
    refetchOnMount: 'always',
    retry: false,
  });

  const latestBySet = useMemo(() => {
    const map = new Map<string, PracticeAttemptSummary>();
    for (const attempt of history.data ?? []) {
      if (!map.has(attempt.practiceSet.id)) map.set(attempt.practiceSet.id, attempt);
    }
    return map;
  }, [history.data]);

  return (setId) => {
    const latest = latestBySet.get(setId);
    if (!latest) return { state: 'not-started' };
    return {
      state: 'completed',
      percent: latest.percentScore ?? null,
      resultHref: `/results/${latest.id}`,
    };
  };
}
