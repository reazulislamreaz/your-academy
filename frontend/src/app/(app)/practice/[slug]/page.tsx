'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ExamSkeleton } from '@/components/skeletons';
import { Surface } from '@/components/ui/surface';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { PracticeAttemptResult, PracticeSetDetail } from '@/lib/api/types';
import { examLabel, practiceKindLabel } from '@/lib/exam-tags';
import { cn } from '@/lib/utils';

export default function PracticePlayerPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const detail = useQuery({
    queryKey: ['practice-set', slug],
    queryFn: () => apiFetch<PracticeSetDetail>(`/practice-sets/${slug}`),
    retry: false,
  });

  const start = useMutation({
    mutationFn: () =>
      apiFetch<{
        id: string;
        startedAt: string;
        durationSeconds?: number | null;
        expiresAt?: string | null;
      }>(`/practice-sets/${slug}/attempts`, { method: 'POST' }),
    onSuccess: (data) => {
      setAttemptId(data.id);
      setExpiresAt(data.expiresAt ?? null);
    },
  });

  const submit = useMutation({
    mutationFn: (id: string) =>
      apiFetch<PracticeAttemptResult>(`/practice-attempts/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          answers: Object.entries(answers).map(([questionId, selectedOptionId]) => ({
            questionId,
            selectedOptionId,
          })),
        }),
      }),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ['practice-attempts'] });
      router.push(`/results/${result.id}`);
    },
  });

  useEffect(() => {
    if (!detail.data?.activeAttempt) return;
    setAttemptId(detail.data.activeAttempt.id);
    setExpiresAt(detail.data.activeAttempt.expiresAt ?? null);
  }, [detail.data?.activeAttempt]);

  useEffect(() => {
    if (!expiresAt || !attemptId) {
      setRemaining(null);
      return;
    }
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      const secs = Math.max(0, Math.floor(ms / 1000));
      setRemaining(secs);
      if (secs <= 0 && !submit.isPending) {
        submit.mutate(attemptId);
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auto-submit only when timer hits 0
  }, [expiresAt, attemptId]);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  if (detail.isLoading) {
    return <ExamSkeleton />;
  }

  if (detail.error instanceof ApiError && detail.error.status === 404) {
    return (
      <EmptyState
        title="Practice set not found"
        description="It may be unpublished or the link is incorrect."
        action={
          <Link href="/quizzes" className="text-sm font-semibold text-[var(--highlight)]">
            Back to quizzes
          </Link>
        }
      />
    );
  }

  if (detail.isError || !detail.data) {
    return <Alert variant="danger">Could not load this practice set.</Alert>;
  }

  const set = detail.data;
  const timerLabel =
    remaining == null
      ? null
      : `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={practiceKindLabel(set.kind)}
        title={set.title}
        description={set.description ?? undefined}
        actions={
          timerLabel ? (
            <Badge variant={remaining != null && remaining < 60 ? 'danger' : 'highlight'}>
              Time left {timerLabel}
            </Badge>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-2 text-xs text-[var(--muted-strong)]">
        <span>{set.questionCount} questions</span>
        {set.examTag ? <span>· {examLabel(set.examTag)}</span> : null}
        {set.negativeMarkPerWrong > 0 ? (
          <span>· −{set.negativeMarkPerWrong} per wrong</span>
        ) : null}
        <span>
          · Answered {answeredCount}/{set.questions.length}
        </span>
      </div>

      {!attemptId ? (
        <Surface className="space-y-4 p-5">
          <p className="text-sm text-[var(--muted-strong)]">
            Start the attempt to answer questions
            {set.durationSeconds
              ? ` within ${Math.round(set.durationSeconds / 60)} minutes`
              : ''}
            . The timer auto-submits when time expires.
          </p>
          <Button
            type="button"
            onClick={() => start.mutate()}
            disabled={start.isPending}
            className="cursor-pointer"
          >
            {start.isPending ? 'Starting…' : 'Start attempt'}
          </Button>
          {start.isError ? (
            <Alert variant="danger">Could not start attempt. Try again.</Alert>
          ) : null}
        </Surface>
      ) : (
        <>
          <div className="space-y-4">
            {set.questions.map((q, index) => (
              <Surface key={q.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-[var(--ink)]">
                    <span className="text-[var(--muted-strong)]">{index + 1}.</span> {q.title}
                  </h3>
                  <Badge variant="outline">{q.difficulty}</Badge>
                </div>
                <p className="text-sm text-[var(--ink-soft)] whitespace-pre-wrap">{q.content}</p>
                <div className="grid gap-2">
                  {q.options.map((opt) => {
                    const selected = answers[q.id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [q.id]: opt.id,
                          }))
                        }
                        className={cn(
                          'cursor-pointer rounded-[10px] border px-3 py-2 text-left text-sm transition-colors',
                          selected
                            ? 'border-[var(--highlight)] bg-[var(--highlight-soft)] text-[var(--highlight)]'
                            : 'border-[var(--line)] hover:bg-[var(--bg-muted)]',
                        )}
                      >
                        <span className="mr-2 font-semibold">{opt.label}.</span>
                        {opt.content}
                      </button>
                    );
                  })}
                </div>
              </Surface>
            ))}
          </div>

          <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-[12px] border border-[var(--line)] bg-[var(--bg-elevated)]/95 p-3 shadow-[var(--shadow-sm)] backdrop-blur">
            <Button
              type="button"
              className="cursor-pointer"
              disabled={submit.isPending}
              onClick={() => attemptId && submit.mutate(attemptId)}
            >
              {submit.isPending ? 'Submitting…' : 'Submit answers'}
            </Button>
            <p className="text-xs text-[var(--muted-strong)]">
              You can leave questions blank; they count as skipped.
            </p>
            {submit.isError ? <Alert variant="danger">Submit failed. Try again.</Alert> : null}
          </div>
        </>
      )}
    </div>
  );
}
