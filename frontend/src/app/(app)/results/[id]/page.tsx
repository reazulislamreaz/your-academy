'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Surface } from '@/components/ui/surface';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { PracticeAttemptResult } from '@/lib/api/types';
import { examLabel, practiceKindLabel } from '@/lib/exam-tags';
import { cn } from '@/lib/utils';
import { ResultDetailPageSkeleton } from '@/components/skeletons';

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div>
      <p className="text-xs text-[var(--muted-strong)]">{label}</p>
      <p className={cn('font-display text-2xl font-bold tabular-nums', tone)}>{value}</p>
    </div>
  );
}

export default function ResultDetailPage() {
  const { id } = useParams<{ id: string }>();
  const result = useQuery({
    queryKey: ['practice-attempt', id],
    queryFn: () => apiFetch<PracticeAttemptResult>(`/practice-attempts/${id}`),
    retry: false,
  });

  if (result.isLoading) {
    return <ResultDetailPageSkeleton />;
  }

  if (result.error instanceof ApiError && result.error.status === 404) {
    return (
      <EmptyState
        title="Result not found"
        description="This attempt may belong to another account."
        action={
          <Link href="/results" className="text-sm font-semibold text-[var(--highlight)]">
            Back to results
          </Link>
        }
      />
    );
  }

  if (result.isError || !result.data) {
    return <Alert variant="danger">Could not load this result.</Alert>;
  }

  const data = result.data;
  const total =
    data.totalQuestions ??
    (data.correctCount ?? 0) + (data.wrongCount ?? 0) + (data.skippedCount ?? 0);
  const attempted = data.attempted ?? (data.correctCount ?? 0) + (data.wrongCount ?? 0);
  const unanswered = data.unanswered ?? data.skippedCount ?? 0;
  const percent = data.percentScore ?? 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={practiceKindLabel(data.practiceSet.kind)}
        title={data.practiceSet.title}
        description="Detailed score summary and answer-by-answer analysis."
      />

      <Surface elevated className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Marks obtained"
          value={`${data.score ?? 0}/${data.maxScore ?? 0}`}
        />
        <Stat label="Percentage" value={`${percent}%`} tone="text-[var(--highlight)]" />
        <Stat label="Time taken" value={formatDuration(data.elapsedSeconds)} />
        <div>
          <p className="text-xs text-[var(--muted-strong)]">Result</p>
          {data.passed == null ? (
            <Badge variant="outline" className="mt-2">
              {data.status === 'EXPIRED' ? 'Time expired' : 'Completed'}
            </Badge>
          ) : (
            <Badge variant={data.passed ? 'success' : 'danger'} className="mt-2">
              {data.passed ? 'Passed' : 'Failed'}
              {data.practiceSet.passMarkPercent != null
                ? ` (pass ${data.practiceSet.passMarkPercent}%)`
                : ''}
            </Badge>
          )}
        </div>
      </Surface>

      <Surface elevated className="grid gap-4 p-5 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total questions" value={total} />
        <Stat label="Attempted" value={attempted} />
        <Stat label="Unanswered" value={unanswered} />
        <Stat label="Correct" value={data.correctCount ?? 0} tone="text-[var(--success)]" />
        <Stat label="Incorrect" value={data.wrongCount ?? 0} tone="text-[var(--danger)]" />
        <Stat
          label="Accuracy"
          value={
            attempted === 0
              ? '—'
              : `${Math.round(((data.correctCount ?? 0) / attempted) * 1000) / 10}%`
          }
        />
      </Surface>

      <div className="flex flex-wrap gap-2 text-xs text-[var(--muted-strong)]">
        <Badge variant="outline">{data.status}</Badge>
        {data.practiceSet.category ? (
          <Badge variant="outline">{data.practiceSet.category.name}</Badge>
        ) : null}
        {data.practiceSet.examTag ? (
          <Badge variant="outline">{examLabel(data.practiceSet.examTag)}</Badge>
        ) : null}
        {data.submittedAt ? (
          <span>Submitted {new Date(data.submittedAt).toLocaleString()}</span>
        ) : null}
      </div>

      {!data.answersVisible ? (
        <Alert variant="warning">
          Detailed correct answers and explanations are available during an active trial or
          subscription. Your score summary is always saved to your account.
        </Alert>
      ) : null}

      <div className="space-y-4">
        <h2 className="font-display text-lg font-bold tracking-tight">Answer analysis</h2>
        {data.review.map((item, index) => {
          const unansweredQ = item.unanswered || !item.selectedOptionId;
          return (
            <Surface
              key={item.questionId}
              elevated
              className={cn(
                'space-y-3 p-4',
                unansweredQ && 'border-[var(--warning)]/35 bg-[var(--warning-soft)]/40',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-medium">
                  <span className="text-[var(--muted-strong)]">{index + 1}.</span> {item.title}
                </h3>
                {data.answersVisible ? (
                  <Badge
                    variant={
                      item.isCorrect === true
                        ? 'success'
                        : unansweredQ
                          ? 'warning'
                          : item.isCorrect === false
                            ? 'danger'
                            : 'outline'
                    }
                  >
                    {item.isCorrect === true
                      ? 'Correct'
                      : unansweredQ
                        ? 'Unanswered'
                        : item.isCorrect === false
                          ? 'Incorrect'
                          : 'Reviewed'}
                  </Badge>
                ) : unansweredQ ? (
                  <Badge variant="warning">Unanswered</Badge>
                ) : (
                  <Badge variant="outline">Answered</Badge>
                )}
              </div>
              <p className="type-prose whitespace-pre-wrap text-[var(--ink-soft)]">{item.content}</p>
              <div className="grid gap-2">
                {item.options.map((opt) => {
                  const selected = item.selectedOptionId === opt.id;
                  const showCorrect = data.answersVisible && opt.isCorrect === true;
                  const showWrong =
                    data.answersVisible && selected && opt.isCorrect === false;
                  return (
                    <div
                      key={opt.id}
                      className={cn(
                        'rounded-[var(--radius-sm)] border px-3 py-2 text-sm',
                        showCorrect &&
                          'border-[var(--learn-correct)]/50 bg-[var(--learn-correct-soft)]',
                        showWrong &&
                          'border-[var(--learn-incorrect)]/45 bg-[var(--learn-incorrect-soft)]',
                        selected &&
                          !data.answersVisible &&
                          'border-[var(--learn-selected)]/50 bg-[var(--learn-selected-soft)]',
                        !showCorrect &&
                          !showWrong &&
                          !(selected && !data.answersVisible) &&
                          'border-[var(--line)]',
                      )}
                    >
                      <span className="mr-2 font-semibold">{opt.label}.</span>
                      {opt.content}
                      {selected ? (
                        <span className="ml-2 text-xs font-semibold text-[var(--muted-strong)]">
                          (your answer)
                        </span>
                      ) : null}
                      {showCorrect ? (
                        <span className="ml-2 text-xs font-semibold text-[var(--success)]">
                          (correct)
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {data.answersVisible && item.explanation ? (
                <p className="rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--bg-desk)] px-3 py-2 text-sm text-[var(--ink-soft)]">
                  <span className="font-semibold text-[var(--ink)]">Explanation: </span>
                  {item.explanation}
                </p>
              ) : null}
            </Surface>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4">
        <Link href="/results" className="text-sm font-semibold text-[var(--highlight)]">
          ← All results
        </Link>
        <Link href="/home#exam-history" className="text-sm font-semibold text-[var(--highlight)]">
          Performance dashboard
        </Link>
      </div>
    </div>
  );
}
