'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { PracticeAttemptSummary } from '@/lib/api/types';
import { examLabel, practiceKindLabel } from '@/lib/exam-tags';

export default function ResultsPage() {
  const list = useQuery({
    queryKey: ['practice-attempts'],
    queryFn: () => apiFetch<PracticeAttemptSummary[]>('/me/practice-attempts?limit=50'),
    retry: false,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Analytics"
        title="My results"
        description="Submitted quizzes and model tests with scores from your account history."
      />

      {list.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : null}

      {list.error instanceof ApiError && (list.error.status === 401 || list.error.status === 403) ? (
        <EmptyState
          title="Sign in to view results"
          description="Quiz and model-test history is tied to your account."
        />
      ) : null}

      {list.isError && !(list.error instanceof ApiError && list.error.status === 401) ? (
        <Alert variant="danger">Could not load results.</Alert>
      ) : null}

      {!list.isLoading && !list.isError && (list.data?.length ?? 0) === 0 ? (
        <EmptyState
          title="No attempts yet"
          description="Complete a quiz or model test to see scores here."
          action={
            <Link href="/quizzes" className="text-sm font-semibold text-[var(--highlight)]">
              Open quiz center
            </Link>
          }
        />
      ) : null}

      <div className="space-y-3">
        {(list.data ?? []).map((attempt) => (
          <Surface key={attempt.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="mb-1 flex flex-wrap gap-1.5">
                  <Badge variant="highlight">{practiceKindLabel(attempt.practiceSet.kind)}</Badge>
                  {attempt.practiceSet.examTag ? (
                    <Badge variant="outline">{examLabel(attempt.practiceSet.examTag)}</Badge>
                  ) : null}
                  <Badge variant="outline">{attempt.status}</Badge>
                </div>
                <h3 className="font-display text-base font-semibold">
                  <Link
                    href={`/results/${attempt.id}`}
                    className="hover:text-[var(--highlight)]"
                  >
                    {attempt.practiceSet.title}
                  </Link>
                </h3>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {attempt.submittedAt
                    ? new Date(attempt.submittedAt).toLocaleString()
                    : 'Not submitted'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-bold tabular-nums text-[var(--ink)]">
                  {attempt.score ?? 0}
                  <span className="text-sm font-medium text-[var(--muted)]">
                    /{attempt.maxScore ?? 0}
                  </span>
                </p>
                <p className="text-xs text-[var(--muted-strong)]">
                  ✓ {attempt.correctCount ?? 0} · ✗ {attempt.wrongCount ?? 0} · —{' '}
                  {attempt.skippedCount ?? 0}
                </p>
              </div>
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}
