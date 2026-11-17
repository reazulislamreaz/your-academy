'use client';

import Link from 'next/link';
import { LearnerPage } from '@/components/layout/learner-page';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadMoreButton } from '@/components/ui/load-more-button';
import { Surface } from '@/components/ui/surface';
import { ContentIn } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api/client';
import type { PracticeAttemptSummary } from '@/lib/api/types';
import { examLabel, practiceKindLabel } from '@/lib/exam-tags';
import { ResultsPageSkeleton } from '@/components/skeletons';
import { useCursorList } from '@/lib/hooks/use-cursor-list';

export default function ResultsPage() {
  const list = useCursorList<PracticeAttemptSummary>(
    ['practice-attempts'],
    (cursor) => {
      const qs = new URLSearchParams({ limit: '20' });
      if (cursor) qs.set('cursor', cursor);
      return `/me/practice-attempts?${qs}`;
    },
    { retry: false },
  );

  const unauthorized =
    list.error instanceof ApiError && (list.error.status === 401 || list.error.status === 403);

  return (
    <LearnerPage dense>
      <PageHeader
        eyebrow="Analytics"
        title="My results"
        description="Submitted quizzes and model tests with scores from your account history."
      />

      {list.isLoading ? <ResultsPageSkeleton omitHeader /> : null}

      {unauthorized ? (
        <EmptyState
          title="Sign in to view results"
          description="Quiz and model-test history is tied to your account."
          action={
            <Link
              href="/login?next=/results"
              className="text-sm font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
            >
              Sign in
            </Link>
          }
        />
      ) : null}

      {list.isError && !unauthorized ? (
        <Alert variant="danger">Could not load results.</Alert>
      ) : null}

      {!list.isLoading && !list.isError && list.items.length === 0 ? (
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

      {!list.isLoading && !list.isError && list.items.length > 0 ? (
        <ContentIn className="space-y-2.5">
          {list.items.map((attempt) => (
            <Surface key={attempt.id} elevated interactive className="p-3.5 sm:p-4">
              <Link href={`/results/${attempt.id}`} className="flex items-start gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="highlight">
                      {practiceKindLabel(attempt.practiceSet.kind)}
                    </Badge>
                    {attempt.practiceSet.examTag ? (
                      <Badge variant="outline">{examLabel(attempt.practiceSet.examTag)}</Badge>
                    ) : null}
                    {attempt.passed != null ? (
                      <Badge variant={attempt.passed ? 'success' : 'danger'}>
                        {attempt.passed ? 'Passed' : 'Failed'}
                      </Badge>
                    ) : (
                      <Badge variant="outline">{attempt.status}</Badge>
                    )}
                  </div>
                  <h3 className="font-display text-[0.95rem] font-semibold tracking-tight text-[var(--ink)] sm:text-base">
                    {attempt.practiceSet.title}
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    {attempt.practiceSet.category?.name
                      ? `${attempt.practiceSet.category.name} · `
                      : ''}
                    {attempt.submittedAt
                      ? new Date(attempt.submittedAt).toLocaleString()
                      : 'Not submitted'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-lg font-bold tabular-nums text-[var(--ink)] sm:text-xl">
                    {attempt.percentScore != null ? `${attempt.percentScore}%` : '—'}
                  </p>
                  <p className="text-xs tabular-nums text-[var(--muted)]">
                    {attempt.score ?? '—'}
                    {attempt.maxScore != null ? `/${attempt.maxScore}` : ''}
                  </p>
                </div>
              </Link>
            </Surface>
          ))}
          <LoadMoreButton
            hasNextPage={list.hasNextPage}
            isFetchingNextPage={list.isFetchingNextPage}
            onLoadMore={() => void list.fetchNextPage()}
          />
        </ContentIn>
      ) : null}
    </LearnerPage>
  );
}
