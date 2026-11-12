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

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={practiceKindLabel(data.practiceSet.kind)}
        title={data.practiceSet.title}
        description="Score summary and answer review for this attempt."
      />

      <Surface elevated className="grid gap-4 p-5 sm:grid-cols-4">
        <div>
          <p className="text-xs text-[var(--muted-strong)]">Score</p>
          <p className="font-display text-2xl font-bold tabular-nums">
            {data.score ?? 0}
            <span className="text-base text-[var(--muted-strong)]">/{data.maxScore ?? 0}</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--muted-strong)]">Correct</p>
          <p className="font-display text-2xl font-bold tabular-nums text-[var(--success)]">
            {data.correctCount ?? 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--muted-strong)]">Wrong</p>
          <p className="font-display text-2xl font-bold tabular-nums text-[var(--danger)]">
            {data.wrongCount ?? 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--muted-strong)]">Skipped</p>
          <p className="font-display text-2xl font-bold tabular-nums">{data.skippedCount ?? 0}</p>
        </div>
      </Surface>

      <div className="flex flex-wrap gap-2 text-xs text-[var(--muted-strong)]">
        <Badge variant="outline">{data.status}</Badge>
        {data.practiceSet.examTag ? (
          <Badge variant="outline">{examLabel(data.practiceSet.examTag)}</Badge>
        ) : null}
        {!data.answersVisible ? (
          <Alert variant="warning" className="w-full">
            Detailed correct answers and explanations are available during an active trial or
            subscription.
          </Alert>
        ) : null}
      </div>

      <div className="space-y-4">
        {data.review.map((item, index) => (
          <Surface key={item.questionId} elevated className="space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-medium">
                <span className="text-[var(--muted-strong)]">{index + 1}.</span> {item.title}
              </h3>
              {data.answersVisible && item.isCorrect != null ? (
                <Badge variant={item.isCorrect ? 'success' : item.selectedOptionId ? 'danger' : 'outline'}>
                  {item.isCorrect ? 'Correct' : item.selectedOptionId ? 'Wrong' : 'Skipped'}
                </Badge>
              ) : null}
            </div>
            <p className="text-sm whitespace-pre-wrap text-[var(--ink-soft)]">{item.content}</p>
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
                      showCorrect && 'border-[var(--learn-correct)]/50 bg-[var(--learn-correct-soft)]',
                      showWrong && 'border-[var(--learn-incorrect)]/45 bg-[var(--learn-incorrect-soft)]',
                      selected &&
                        !data.answersVisible &&
                        'border-[var(--learn-selected)]/50 bg-[var(--learn-selected-soft)]',
                      !showCorrect && !showWrong && !(selected && !data.answersVisible) &&
                        'border-[var(--line)]',
                    )}
                  >
                    <span className="mr-2 font-semibold">{opt.label}.</span>
                    {opt.content}
                    {selected ? (
                      <span className="ml-2 text-xs text-[var(--muted-strong)]">(your answer)</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {data.answersVisible && item.explanation ? (
              <p className="text-sm text-[var(--ink-soft)]">
                <span className="font-semibold">Explanation:</span> {item.explanation}
              </p>
            ) : null}
          </Surface>
        ))}
      </div>

      <Link href="/results" className="text-sm font-semibold text-[var(--highlight)]">
        ← All results
      </Link>
    </div>
  );
}
