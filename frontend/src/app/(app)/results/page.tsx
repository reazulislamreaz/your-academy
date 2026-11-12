'use client';

import Link from 'next/link';
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
    <div className="space-y-8">
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
        <ContentIn className="space-y-3">
          {list.items.map((attempt) => (
            <Surface elevated key={attempt.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="mb-1 flex flex-wrap gap-1.5">
                    <Badge variant="highlight">
                      {practiceKindLabel(attempt.practiceSet.kind)}
                    </Badge>
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
                  <p className="mt-1 text-xs text-[var(--muted-strong)]">
                    {attempt.submittedAt
                      ? new Date(attempt.submittedAt).toLocaleString()
                      : 'Not submitted'}
                  </p>
                </div>
                <p className="font-display text-xl font-bold tabular-nums">
                  {attempt.score ?? '—'}
                  {attempt.maxScore != null ? `/${attempt.maxScore}` : ''}
                </p>
              </div>
            </Surface>
          ))}
          <LoadMoreButton
            hasNextPage={list.hasNextPage}
            isFetchingNextPage={list.isFetchingNextPage}
            onLoadMore={() => void list.fetchNextPage()}
          />
        </ContentIn>
      ) : null}
    </div>
  );
}
