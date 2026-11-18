'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PublicExamDetail } from '@your-academy/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/client';
import { submitPublicExamAttempt } from '@/lib/api/exams';
import { cn } from '@/lib/utils';
import {
  clearGuestExamSession,
  loadGuestExamSession,
  saveGuestExamSession,
} from './exam-session';
import { NameEntryModal } from './name-entry-modal';
import { useExamCountdown } from './use-exam-countdown';

type Props = {
  exam: PublicExamDetail;
};

export function GuestExamPlayer({ exam }: Props) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const submittingRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const userNameRef = useRef(userName);
  userNameRef.current = userName;

  // Restore in-progress attempt after refresh.
  useEffect(() => {
    const saved = loadGuestExamSession(exam.id);
    if (saved) {
      setUserName(saved.userName);
      setStartedAtMs(saved.startedAtMs);
      setAnswers(saved.answers);
      const maxIdx = Math.max(0, exam.questions.length - 1);
      setCurrentIndex(Math.min(Math.max(0, saved.currentIndex), maxIdx));
    }
    setHydrated(true);
  }, [exam.id, exam.questions.length]);

  // Persist progress while running.
  useEffect(() => {
    if (!hydrated || !userName || !startedAtMs) return;
    saveGuestExamSession({
      examId: exam.id,
      userName,
      startedAtMs,
      answers,
      currentIndex,
    });
  }, [answers, currentIndex, exam.id, hydrated, startedAtMs, userName]);

  const submit = useCallback(
    async (timedOut: boolean, elapsedSeconds: number) => {
      const name = userNameRef.current;
      if (!name || submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      setConfirmSubmit(false);
      setError(null);
      try {
        const result = await submitPublicExamAttempt(exam.id, {
          userName: name,
          userAnswers: answersRef.current,
          elapsedSeconds,
          timedOut,
        });
        clearGuestExamSession(exam.id);
        router.push(`/exams/${exam.slug}/result/${result.attemptId}`);
      } catch (err) {
        submittingRef.current = false;
        setSubmitting(false);
        setError(err instanceof ApiError ? err.message : 'Could not submit exam. Please try again.');
      }
    },
    [exam.id, exam.slug, router],
  );

  const { display, remainingSeconds, elapsedSeconds, isExpired } = useExamCountdown({
    durationInMinutes: exam.durationInMinutes,
    startedAtMs,
    onExpire: () => {
      void submit(true, Math.max(1, exam.durationInMinutes) * 60);
    },
  });

  // If restored session is already past deadline, submit immediately.
  useEffect(() => {
    if (!hydrated || !startedAtMs || !userName || submittingRef.current) return;
    if (isExpired) {
      void submit(true, Math.max(1, exam.durationInMinutes) * 60);
    }
  }, [exam.durationInMinutes, hydrated, isExpired, startedAtMs, submit, userName]);

  const question = exam.questions[currentIndex];
  const answeredCount = useMemo(
    () => exam.questions.filter((q) => Boolean(answers[q.id])).length,
    [answers, exam.questions],
  );

  const startExam = (name: string) => {
    const now = Date.now();
    setUserName(name);
    setStartedAtMs(now);
    saveGuestExamSession({
      examId: exam.id,
      userName: name,
      startedAtMs: now,
      answers: {},
      currentIndex: 0,
    });
  };

  if (!hydrated) {
    return (
      <div className="mx-auto flex min-h-[40vh] w-full max-w-3xl items-center justify-center px-4">
        <p className="text-sm text-[var(--muted)]">Loading exam…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <NameEntryModal
        examTitle={exam.title}
        open={!userName}
        durationInMinutes={exam.durationInMinutes}
        totalQuestions={exam.totalQuestions}
        onStart={startExam}
      />

      <header className="sticky top-[calc(var(--header-h,4.5rem)+0.5rem)] z-20 -mx-4 mb-2 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] px-4 py-3 backdrop-blur-md sm:-mx-0 sm:rounded-[var(--radius-lg)] sm:border sm:bg-[var(--bg-elevated)] sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
              Live exam
            </p>
            <h1 className="truncate font-display text-lg font-bold tracking-tight text-[var(--ink)] sm:text-xl">
              {exam.title}
            </h1>
            {userName ? (
              <p className="mt-0.5 text-sm text-[var(--muted-strong)]">Candidate: {userName}</p>
            ) : null}
          </div>
          <div
            className={cn(
              'rounded-[var(--radius)] border px-3 py-2 text-center tabular-nums',
              remainingSeconds <= 60
                ? 'border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger-fg)]'
                : 'border-[var(--line)] bg-[var(--bg-elevated)] text-[var(--ink)] sm:bg-[var(--bg-muted)]',
            )}
            aria-live="polite"
            aria-label={`Time remaining ${display}`}
          >
            <p className="text-[0.65rem] font-semibold tracking-wide text-[var(--muted)] uppercase">
              Time left
            </p>
            <p className="font-display text-2xl font-bold leading-none">{display}</p>
          </div>
        </div>
      </header>

      {error ? (
        <Alert variant="danger" className="mt-4">
          {error}
        </Alert>
      ) : null}

      {exam.questions.length > 1 ? (
        <nav
          className="mt-4 flex flex-wrap gap-1.5"
          aria-label="Question navigator"
        >
          {exam.questions.map((q, idx) => {
            const answered = Boolean(answers[q.id]);
            const active = idx === currentIndex;
            return (
              <button
                key={q.id}
                type="button"
                disabled={submitting || !userName}
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  'flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-xs font-bold transition-colors',
                  active && 'bg-[var(--accent)] text-[var(--accent-fg)]',
                  !active && answered && 'bg-[var(--accent-soft)] text-[var(--accent)]',
                  !active && !answered && 'bg-[var(--bg-muted)] text-[var(--muted-strong)]',
                )}
                aria-label={`Question ${idx + 1}${answered ? ', answered' : ''}`}
                aria-current={active ? 'step' : undefined}
              >
                {idx + 1}
              </button>
            );
          })}
        </nav>
      ) : null}

      {question ? (
        <section className="mt-5">
          <div className="flex items-center justify-between gap-3 text-sm text-[var(--muted-strong)]">
            <span>
              Question {currentIndex + 1} of {exam.totalQuestions}
            </span>
            <span>
              Answered {answeredCount}/{exam.totalQuestions}
            </span>
          </div>

          <h2 className="type-prose-title mt-4 font-reading text-lg leading-relaxed font-medium text-[var(--ink)] sm:text-xl">
            {question.questionText}
          </h2>

          <div className="mt-5 grid gap-2.5" role="radiogroup" aria-label="Options">
            {question.options.map((option, idx) => {
              const selected = answers[question.id] === option;
              const label = String.fromCharCode(65 + idx);
              return (
                <button
                  key={`${question.id}-${idx}`}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={submitting || !userName}
                  onClick={() =>
                    setAnswers((prev) => ({
                      ...prev,
                      [question.id]: option,
                    }))
                  }
                  className={cn(
                    'flex w-full items-start gap-3 rounded-[var(--radius)] border px-3.5 py-3 text-left transition-colors',
                    selected
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_35%,transparent)]'
                      : 'border-[var(--line)] bg-[var(--bg-elevated)] hover:border-[var(--accent)]/40 hover:bg-[var(--brand-wash)]',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      selected
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                        : 'bg-[var(--bg-muted)] text-[var(--muted-strong)]',
                    )}
                  >
                    {label}
                  </span>
                  <span className="type-mcq-option font-reading text-[0.95rem] leading-relaxed text-[var(--ink)]">
                    {option}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={currentIndex === 0 || submitting}
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            >
              Previous
            </Button>
            <div className="flex flex-wrap gap-2">
              {currentIndex < exam.questions.length - 1 ? (
                <Button
                  type="button"
                  disabled={submitting}
                  onClick={() => setCurrentIndex((i) => Math.min(exam.questions.length - 1, i + 1))}
                >
                  Next
                </Button>
              ) : null}
              <Button
                type="button"
                variant={currentIndex === exam.questions.length - 1 ? 'primary' : 'outline'}
                disabled={!userName || submitting}
                onClick={() => setConfirmSubmit(true)}
              >
                {submitting ? 'Submitting…' : 'Submit exam'}
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <Alert variant="warning" className="mt-6">
          This exam has no questions yet.
        </Alert>
      )}

      {confirmSubmit ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-exam-title"
            className="w-full max-w-md rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-lg)]"
          >
            <h2 id="submit-exam-title" className="font-display text-lg font-bold text-[var(--ink)]">
              Submit exam?
            </h2>
            <p className="mt-2 text-sm text-[var(--muted-strong)]">
              You have answered {answeredCount} of {exam.totalQuestions} questions. Unanswered
              items count as wrong.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirmSubmit(false)}>
                Keep practicing
              </Button>
              <Button
                type="button"
                disabled={submitting}
                onClick={() => void submit(false, elapsedSeconds)}
              >
                {submitting ? 'Submitting…' : 'Confirm submit'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
