'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EntitlementCallout } from '@/components/access/entitlement-callout';
import { OptionRow } from '@/components/questions/option-row';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { ExamAttemptDetail, ExamAttemptSummary } from '@/lib/api/types';

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function ExamAttemptPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const autoSubmitted = useRef(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['exam-attempt', params.id],
    queryFn: () => apiFetch<ExamAttemptDetail>(`/exam-attempts/${params.id}`),
    retry: false,
  });

  // Seed selections from saved answers (resume after refresh).
  useEffect(() => {
    if (!data) return;
    const seeded: Record<string, string> = {};
    for (const q of data.questions) {
      if (q.selectedOptionId) seeded[q.id] = q.selectedOptionId;
    }
    setSelections(seeded);
  }, [data?.id]);

  const submit = useMutation({
    mutationFn: () =>
      apiFetch<ExamAttemptSummary>(`/exam-attempts/${params.id}/submit`, { method: 'POST' }),
    onSuccess: () => {
      router.push(`/exams/attempts/${params.id}/result`);
    },
    onError: (err) => {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not submit the exam');
    },
  });

  const submitRef = useRef(submit.mutate);
  submitRef.current = submit.mutate;

  const doSubmit = useCallback(() => {
    if (!submit.isPending && !autoSubmitted.current) {
      autoSubmitted.current = true;
      submitRef.current();
    }
  }, [submit.isPending]);

  // Countdown from the server start time; auto-submit at zero.
  useEffect(() => {
    if (!data || data.status !== 'IN_PROGRESS') return;
    const endsAt =
      new Date(data.startedAt).getTime() + data.examPaper.durationMinutes * 60_000;
    const tick = () => {
      const remaining = endsAt - Date.now();
      setRemainingMs(remaining);
      if (remaining <= 0) doSubmit();
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [data?.id, data?.status, doSubmit]);

  // A closed attempt belongs on the result page.
  useEffect(() => {
    if (data && data.status !== 'IN_PROGRESS') {
      router.push(`/exams/attempts/${params.id}/result`);
    }
  }, [data?.status, params.id, router]);

  const answer = useMutation({
    mutationFn: (body: { questionId: string; selectedOptionId: string }) =>
      apiFetch(`/exam-attempts/${params.id}/answer`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return <Alert variant="warning">Sign in to continue this exam.</Alert>;
  }
  if (error || !data) {
    return <Alert variant="danger">Exam attempt not found.</Alert>;
  }
  if (data.status !== 'IN_PROGRESS') {
    return <Skeleton className="h-40 w-full" />;
  }

  const question = data.questions[index];
  const total = data.questions.length;
  const answeredCount = Object.keys(selections).length;
  const selectedId = question ? (selections[question.id] ?? null) : null;

  return (
    <article className="mx-auto max-w-3xl space-y-7 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">{data.examPaper.title}</p>
          <p className="font-display text-xl font-semibold tracking-tight">
            Question {index + 1} of {total}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={remainingMs !== null && remainingMs < 5 * 60_000 ? 'outline' : 'highlight'}>
            {remainingMs === null ? '—' : `${formatRemaining(remainingMs)} left`}
          </Badge>
          <Badge variant="outline">
            {answeredCount}/{total} answered
          </Badge>
        </div>
      </div>

      {submitError ? <Alert variant="danger">{submitError}</Alert> : null}

      {question ? (
        <>
          <header className="space-y-4 border-b border-[var(--line)] pb-6">
            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
              <span>{question.category.name}</span>
              {question.subcategory ? (
                <>
                  <span aria-hidden>/</span>
                  <span>{question.subcategory.name}</span>
                </>
              ) : null}
              <Badge variant="highlight">{question.difficulty}</Badge>
              {question.kind === 'WRITTEN' ? <Badge variant="outline">Written</Badge> : null}
            </div>
            <h1 className="font-display text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-tight">
              {question.title}
            </h1>
            <p className="font-reading text-lg leading-relaxed break-words text-[var(--ink-soft)]">
              {question.content}
            </p>
          </header>

          {question.kind === 'WRITTEN' ? (
            <EntitlementCallout
              variant="info"
              title="Written question"
              description="Written questions are not answered inside a timed exam. Move on to the next question — this one counts as unanswered for scoring."
            />
          ) : (
            <div className="grid gap-2.5" role="radiogroup" aria-label="Answer options">
              {question.options.map((option) => (
                <OptionRow
                  key={option.id}
                  label={option.label}
                  content={option.content}
                  state={selectedId === option.id ? 'selected' : 'idle'}
                  onSelect={() => {
                    setSelections((prev) => ({ ...prev, [question.id]: option.id }));
                    answer.mutate({ questionId: question.id, selectedOptionId: option.id });
                  }}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <Alert variant="info">This paper has no questions.</Alert>
      )}

      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--line)] bg-[var(--bg-elevated)]/95 backdrop-blur-md"
        role="navigation"
        aria-label="Exam navigation"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <Button
            variant="ghost"
            size="md"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Previous
          </Button>

          <ConfirmButton
            size="md"
            disabled={submit.isPending}
            confirmMessage="Submit this exam? You cannot change answers after submitting."
            onConfirm={() => submit.mutate()}
          >
            {submit.isPending ? 'Submitting…' : 'Submit'}
          </ConfirmButton>

          <Button
            variant="outline"
            size="md"
            disabled={index >= total - 1}
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </article>
  );
}
