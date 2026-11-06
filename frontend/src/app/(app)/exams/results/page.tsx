'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ListRow } from '@/components/ui/list-row';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { ExamAttemptSummary } from '@/lib/api/types';

export default function ExamResultsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['exam-attempts-me'],
    queryFn: () => apiFetch<ExamAttemptSummary[]>('/exam-attempts/me'),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return (
      <Alert variant="warning">
        Sign in to view your results.{' '}
        <Link href="/login" className="font-semibold underline-offset-2 hover:underline">
          Sign in
        </Link>
      </Alert>
    );
  }
  if (error || !data) {
    return <Alert variant="danger">Could not load results.</Alert>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Model tests"
        title="My results"
        description="Every timed exam you sat, newest first. Scores are always visible; per-question answers unlock during your trial or with a future premium plan."
        actions={
          <Link href="/exams">
            <Button size="sm">Browse papers</Button>
          </Link>
        }
      />

      {data.length === 0 ? (
        <EmptyState
          title="No exams yet"
          description="Sit a timed model test from any exam paper and your result will appear here."
          action={
            <Link href="/exams">
              <Button size="sm">Browse papers</Button>
            </Link>
          }
        />
      ) : (
        <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {data.map((attempt) => {
            const pct =
              attempt.totalCount > 0
                ? Math.round((attempt.correctCount / attempt.totalCount) * 100)
                : 0;
            const href =
              attempt.status === 'IN_PROGRESS'
                ? `/exams/attempts/${attempt.id}`
                : `/exams/attempts/${attempt.id}/result`;
            return (
              <ListRow
                key={attempt.id}
                href={href}
                meta={
                  <>
                    <span>
                      {attempt.examPaper.examBody}
                      {attempt.examPaper.year ? ` · ${attempt.examPaper.year}` : ''}
                    </span>
                    <span>{new Date(attempt.startedAt).toLocaleDateString()}</span>
                    <Badge
                      variant={
                        attempt.status === 'SUBMITTED'
                          ? 'success'
                          : attempt.status === 'EXPIRED'
                            ? 'outline'
                            : 'highlight'
                      }
                    >
                      {attempt.status === 'IN_PROGRESS'
                        ? 'In progress'
                        : attempt.status === 'EXPIRED'
                          ? 'Expired'
                          : 'Submitted'}
                    </Badge>
                  </>
                }
                title={
                  <span className="font-display text-lg font-semibold tracking-tight">
                    {attempt.examPaper.title}
                  </span>
                }
                description={
                  attempt.status === 'IN_PROGRESS'
                    ? 'Resume this exam'
                    : `${attempt.correctCount} correct · ${attempt.wrongCount} wrong · ${attempt.unansweredCount} unanswered`
                }
                trailing={
                  <span className="flex items-center gap-2">
                    {attempt.status !== 'IN_PROGRESS' ? (
                      <span className="font-display text-lg font-bold tabular-nums">{pct}%</span>
                    ) : null}
                    <ChevronRight className="h-4 w-4 text-[var(--muted)]" aria-hidden />
                  </span>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
