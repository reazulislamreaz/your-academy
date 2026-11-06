'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Check, Minus, X } from 'lucide-react';
import { EntitlementCallout } from '@/components/access/entitlement-callout';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { ExamAttemptDetail } from '@/lib/api/types';

export default function ExamResultPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ['exam-attempt', params.id],
    queryFn: () => apiFetch<ExamAttemptDetail>(`/exam-attempts/${params.id}`),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return <Alert variant="warning">Sign in to view this result.</Alert>;
  }
  if (error || !data) {
    return <Alert variant="danger">Result not found.</Alert>;
  }

  if (data.status === 'IN_PROGRESS') {
    return (
      <div className="space-y-6">
        <Alert variant="info">
          This exam is still in progress. Finish it to see your result.
        </Alert>
        <Link href={`/exams/attempts/${params.id}`}>
          <Button>Resume exam</Button>
        </Link>
      </div>
    );
  }

  const scorePct =
    data.totalCount > 0 ? Math.round((data.correctCount / data.totalCount) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="space-y-2 border-b border-[var(--line)] pb-6">
        <p className="text-xs font-semibold tracking-[0.14em] text-[var(--highlight)] uppercase">
          {data.status === 'EXPIRED' ? 'Time expired — auto-submitted' : 'Result'}
        </p>
        <h1 className="font-display text-[clamp(1.75rem,3vw,2.25rem)] font-bold tracking-tight">
          {data.examPaper.title}
        </h1>
        <p className="text-sm text-[var(--muted)]">
          {data.examPaper.examBody}
          {data.examPaper.year ? ` · ${data.examPaper.year}` : ''} ·{' '}
          {data.submittedAt ? new Date(data.submittedAt).toLocaleString() : ''}
        </p>
      </div>

      <div className="grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-4">
        <div className="bg-[var(--bg-elevated)] p-5">
          <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
            Score
          </p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums">{scorePct}%</p>
          <p className="mt-3 text-xs text-[var(--muted)]">
            {data.correctCount} of {data.totalCount}
          </p>
        </div>
        <div className="bg-[var(--bg-elevated)] p-5">
          <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
            Correct
          </p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums">{data.correctCount}</p>
        </div>
        <div className="bg-[var(--bg-elevated)] p-5">
          <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
            Wrong
          </p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums">{data.wrongCount}</p>
        </div>
        <div className="bg-[var(--bg-elevated)] p-5">
          <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
            Unanswered
          </p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums">
            {data.unansweredCount}
          </p>
        </div>
      </div>

      {!data.answersVisible ? (
        <EntitlementCallout
          variant="locked"
          title="Per-question answers are premium"
          description="Your score above is always yours. Which option was correct — and why — unlocks during your trial or with a future premium plan. Your own selections are shown below."
        />
      ) : null}

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold tracking-tight">Review</h2>
        {data.questions.map((q, i) => {
          const selected = q.options.find((o) => o.id === q.selectedOptionId);
          const correct = q.options.find((o) => o.isCorrect === true);
          const state =
            !q.selectedOptionId
              ? 'unanswered'
              : q.isCorrect === true
                ? 'correct'
                : q.isCorrect === false
                  ? 'wrong'
                  : 'unknown';
          return (
            <Surface key={q.id} className="space-y-3 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-[var(--muted)]">
                    Question {i + 1} · {q.category.name} · {q.difficulty}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-semibold tracking-tight">
                    {q.title}
                  </h3>
                </div>
                {state === 'correct' ? (
                  <Badge variant="success">
                    <Check className="h-3 w-3" aria-hidden /> Correct
                  </Badge>
                ) : state === 'wrong' ? (
                  <Badge variant="outline">
                    <X className="h-3 w-3" aria-hidden /> Wrong
                  </Badge>
                ) : state === 'unanswered' ? (
                  <Badge variant="outline">
                    <Minus className="h-3 w-3" aria-hidden /> Unanswered
                  </Badge>
                ) : null}
              </div>
              <p className="font-reading leading-relaxed text-[var(--ink-soft)]">{q.content}</p>
              <ul className="space-y-1.5 text-sm">
                {q.options.map((o) => (
                  <li
                    key={o.id}
                    className={
                      o.id === q.selectedOptionId
                        ? 'font-semibold text-[var(--ink)]'
                        : 'text-[var(--muted-strong)]'
                    }
                  >
                    {o.label}. {o.content}
                    {o.id === q.selectedOptionId ? ' — your answer' : ''}
                    {o.isCorrect === true ? ' — correct answer' : ''}
                  </li>
                ))}
              </ul>
              {state === 'wrong' && selected && correct ? (
                <p className="text-sm text-[var(--muted)]">
                  You chose {selected.label}; the correct answer is {correct.label}.
                </p>
              ) : null}
              {q.explanation ? (
                <p className="text-sm leading-relaxed text-[var(--muted-strong)]">
                  <span className="font-semibold text-[var(--ink)]">Explanation: </span>
                  {q.explanation}
                </p>
              ) : null}
              {q.kind === 'WRITTEN' && q.modelAnswer ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-[var(--muted-strong)]">
                  <span className="font-semibold text-[var(--ink)]">Model answer: </span>
                  {q.modelAnswer}
                </p>
              ) : null}
            </Surface>
          );
        })}
      </section>

      <div className="flex flex-wrap gap-2">
        <Link href={`/exams/${data.examPaper.slug}`}>
          <Button variant="soft">Back to paper</Button>
        </Link>
        <Link href="/exams/results">
          <Button variant="outline">All results</Button>
        </Link>
      </div>
    </div>
  );
}
