'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Surface } from '@/components/ui/surface';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { PracticeAttemptResult, PracticeSetDetail } from '@/lib/api/types';
import { examLabel, practiceKindLabel } from '@/lib/exam-tags';
import { cn } from '@/lib/utils';
import { PracticePlayerPageSkeleton } from '@/components/skeletons';

function formatTimer(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type ActiveAttemptPayload = {
  id: string;
  startedAt: string;
  durationSeconds?: number | null;
  expiresAt?: string | null;
  savedAnswers?: Array<{ questionId: string; selectedOptionId: string }>;
  serverNow?: string;
};

export default function PracticePlayerPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [clockSkewMs, setClockSkewMs] = useState(0);
  const [warning, setWarning] = useState<'5m' | '1m' | null>(null);
  const [warned5, setWarned5] = useState(false);
  const [warned1, setWarned1] = useState(false);
  const [locked, setLocked] = useState(false);
  const answersRef = useRef(answers);
  const saveTimerRef = useRef<number | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const detail = useQuery({
    queryKey: ['practice-set', slug],
    queryFn: () => apiFetch<PracticeSetDetail>(`/practice-sets/${slug}`),
    retry: false,
  });

  const applyActive = (data: ActiveAttemptPayload) => {
    setAttemptId(data.id);
    setExpiresAt(data.expiresAt ?? null);
    if (data.serverNow) {
      setClockSkewMs(new Date(data.serverNow).getTime() - Date.now());
    }
    if (data.savedAnswers?.length) {
      const restored: Record<string, string> = {};
      for (const row of data.savedAnswers) {
        restored[row.questionId] = row.selectedOptionId;
      }
      setAnswers(restored);
    }
  };

  const start = useMutation({
    mutationFn: () => apiFetch<ActiveAttemptPayload>(`/practice-sets/${slug}/attempts`, { method: 'POST' }),
    onSuccess: applyActive,
  });

  const saveProgress = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ expiresAt?: string | null; serverNow?: string }>(
        `/practice-attempts/${id}/progress`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            answers: Object.entries(answersRef.current).map(([questionId, selectedOptionId]) => ({
              questionId,
              selectedOptionId,
            })),
          }),
        },
      ),
    onSuccess: (data) => {
      if (data.expiresAt) setExpiresAt(data.expiresAt);
      if (data.serverNow) setClockSkewMs(new Date(data.serverNow).getTime() - Date.now());
    },
  });

  const submit = useMutation({
    mutationFn: (id: string) =>
      apiFetch<PracticeAttemptResult>(`/practice-attempts/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          answers: Object.entries(answersRef.current).map(([questionId, selectedOptionId]) => ({
            questionId,
            selectedOptionId,
          })),
        }),
      }),
    onSuccess: (result) => {
      submittedRef.current = true;
      setLocked(true);
      void qc.invalidateQueries({ queryKey: ['practice-attempts'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      void qc.invalidateQueries({ queryKey: ['exam-performance'] });
      router.push(`/results/${result.id}`);
    },
  });

  const queueSave = (id: string) => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      if (!submittedRef.current) saveProgress.mutate(id);
    }, 600);
  };

  useEffect(() => {
    if (!detail.data?.activeAttempt) return;
    applyActive(detail.data.activeAttempt);
    if (detail.data.serverNow) {
      setClockSkewMs(new Date(detail.data.serverNow).getTime() - Date.now());
    }
  }, [detail.data?.activeAttempt, detail.data?.serverNow]);

  useEffect(() => {
    if (!expiresAt || !attemptId) {
      setRemaining(null);
      return;
    }
    const tick = () => {
      const now = Date.now() + clockSkewMs;
      const ms = new Date(expiresAt).getTime() - now;
      const secs = Math.max(0, Math.floor(ms / 1000));
      setRemaining(secs);
      if (secs <= 300 && secs > 60 && !warned5) {
        setWarned5(true);
        setWarning('5m');
      }
      if (secs <= 60 && secs > 0 && !warned1) {
        setWarned1(true);
        setWarning('1m');
      }
      if (secs <= 0 && !submittedRef.current && !submit.isPending) {
        setLocked(true);
        submittedRef.current = true;
        submit.mutate(attemptId);
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, attemptId, clockSkewMs, warned5, warned1, submit.isPending]);

  // Persist on tab hide / unload.
  useEffect(() => {
    if (!attemptId) return;
    const flush = () => {
      if (submittedRef.current) return;
      const payload = JSON.stringify({
        answers: Object.entries(answersRef.current).map(([questionId, selectedOptionId]) => ({
          questionId,
          selectedOptionId,
        })),
      });
      // Best-effort beacon; CSRF cookie still sent with credentials on same-origin fetch fallback.
      void apiFetch(`/practice-attempts/${attemptId}/progress`, {
        method: 'PATCH',
        body: payload,
      }).catch(() => undefined);
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [attemptId]);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  if (detail.isLoading) {
    return <PracticePlayerPageSkeleton />;
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
  const timerUrgent = remaining != null && remaining <= 60;
  const timerWarn = remaining != null && remaining <= 300 && remaining > 60;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={practiceKindLabel(set.kind)}
        title={set.title}
        description={set.description ?? undefined}
        actions={
          remaining != null ? (
            <Badge variant={timerUrgent ? 'danger' : timerWarn ? 'warning' : 'highlight'}>
              Time left {formatTimer(remaining)}
            </Badge>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-2 text-xs text-[var(--muted-strong)]">
        <span>{set.questionCount} questions</span>
        {set.durationSeconds ? (
          <span>· {Math.round(set.durationSeconds / 60)} min limit</span>
        ) : (
          <span>· Untimed</span>
        )}
        {set.examTag ? <span>· {examLabel(set.examTag)}</span> : null}
        {set.negativeMarkPerWrong > 0 ? (
          <span>· −{set.negativeMarkPerWrong} per wrong</span>
        ) : null}
        {set.passMarkPercent != null ? <span>· Pass {set.passMarkPercent}%</span> : null}
        <span>
          · Answered {answeredCount}/{set.questions.length}
        </span>
        {saveProgress.isPending ? <span>· Saving…</span> : null}
      </div>

      {warning === '5m' ? (
        <Alert variant="warning">
          5 minutes remaining. Answers are saved automatically — submit when ready.{' '}
          <button
            type="button"
            className="cursor-pointer font-semibold underline"
            onClick={() => setWarning(null)}
          >
            Dismiss
          </button>
        </Alert>
      ) : null}
      {warning === '1m' ? (
        <Alert variant="danger">
          1 minute remaining. The exam will auto-submit when time reaches zero.{' '}
          <button
            type="button"
            className="cursor-pointer font-semibold underline"
            onClick={() => setWarning(null)}
          >
            Dismiss
          </button>
        </Alert>
      ) : null}

      {!attemptId ? (
        <Surface elevated className="space-y-4 p-5">
          <p className="text-sm text-[var(--muted-strong)]">
            Start the attempt to answer questions
            {set.durationSeconds
              ? ` within ${Math.round(set.durationSeconds / 60)} minutes`
              : ''}
            . The server-validated timer auto-submits when time expires. Progress is saved if you
            refresh or disconnect.
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
              <Surface key={q.id} elevated className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-[var(--ink)]">
                    <span className="text-[var(--muted-strong)]">{index + 1}.</span> {q.title}
                  </h3>
                  <Badge variant="outline">{q.difficulty}</Badge>
                </div>
                <p className="text-sm whitespace-pre-wrap text-[var(--ink-soft)]">{q.content}</p>
                <div
                  className="grid gap-2"
                  role="radiogroup"
                  aria-label={`Options for question ${index + 1}`}
                >
                  {q.options.map((opt) => {
                    const selected = answers[q.id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={locked || submit.isPending}
                        onClick={() => {
                          if (locked) return;
                          setAnswers((prev) => {
                            const next = { ...prev, [q.id]: opt.id };
                            answersRef.current = next;
                            return next;
                          });
                          if (attemptId) queueSave(attemptId);
                        }}
                        className={cn(
                          'cursor-pointer rounded-[var(--radius-sm)] border px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-70',
                          selected
                            ? 'border-[var(--learn-selected)] bg-[var(--learn-selected-soft)] text-[var(--info-fg)]'
                            : 'border-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--bg-muted)]',
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

          <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)]/95 p-3 shadow-[var(--shadow)] backdrop-blur">
            <Button
              type="button"
              className="cursor-pointer"
              disabled={submit.isPending || locked}
              onClick={() => attemptId && submit.mutate(attemptId)}
            >
              {submit.isPending || locked ? 'Submitting…' : 'Submit answers'}
            </Button>
            <p className="text-xs text-[var(--muted-strong)]">
              Blank questions count as unanswered. Progress autosaves to your account.
            </p>
            {submit.isError ? <Alert variant="danger">Submit failed. Try again.</Alert> : null}
          </div>
        </>
      )}
    </div>
  );
}
