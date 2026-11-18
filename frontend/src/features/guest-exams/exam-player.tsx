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

  const submittingRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const userNameRef = useRef(userName);
  userNameRef.current = userName;

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
      // Timeout may submit with unanswered items — allowed by product rule for timer end.
      void submit(true, Math.max(1, exam.durationInMinutes) * 60);
    },
  });

  useEffect(() => {
    if (!hydrated || !startedAtMs || !userName || submittingRef.current) return;
    if (isExpired) {
      void submit(true, Math.max(1, exam.durationInMinutes) * 60);
    }
  }, [exam.durationInMinutes, hydrated, isExpired, startedAtMs, submit, userName]);

  const question = exam.questions[currentIndex];
  const totalQuestions = exam.questions.length;

  const answeredCount = useMemo(
    () => exam.questions.filter((q) => Boolean(answers[q.id]?.trim())).length,
    [answers, exam.questions],
  );

  const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions;
  const isLast = currentIndex >= totalQuestions - 1;
  const canGoPrev = currentIndex > 0 && !submitting;
  const canGoNext = currentIndex < totalQuestions - 1 && !submitting;

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
    <div className="guest-exam-player mx-auto w-full max-w-3xl overflow-x-clip px-3 py-4 sm:px-6 sm:py-8">
      <NameEntryModal
        examTitle={exam.title}
        open={!userName}
        durationInMinutes={exam.durationInMinutes}
        totalQuestions={exam.totalQuestions}
        onStart={startExam}
      />

      <header className="guest-exam-chrome sticky top-[calc(var(--header-h,4.5rem)+0.25rem)] z-20 mb-3 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-elevated)_94%,transparent)] px-3 py-2.5 shadow-[var(--shadow-sm)] backdrop-blur-md sm:px-4 sm:py-3">
        <div className="flex items-start justify-between gap-2.5 sm:items-center sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[0.625rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase sm:text-[0.65rem]">
              Live exam
            </p>
            <h1 className="mt-0.5 truncate font-display text-base font-bold tracking-tight text-[var(--ink)] sm:text-xl">
              {exam.title}
            </h1>
            {userName ? (
              <p className="mt-0.5 truncate text-xs text-[var(--muted-strong)] sm:text-sm">
                Candidate: {userName}
              </p>
            ) : null}
          </div>
          <div
            className={cn(
              'shrink-0 rounded-[var(--radius)] border px-2.5 py-1.5 text-center tabular-nums sm:px-3 sm:py-2',
              remainingSeconds <= 60
                ? 'border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger-fg)]'
                : 'border-[var(--line)] bg-[var(--bg-muted)] text-[var(--ink)]',
            )}
            aria-live="polite"
            aria-label={`Time remaining ${display}`}
          >
            <p className="text-[0.6rem] font-semibold tracking-wide text-[var(--muted)] uppercase sm:text-[0.65rem]">
              Time left
            </p>
            <p className="font-display text-xl font-bold leading-none sm:text-2xl">{display}</p>
          </div>
        </div>
      </header>

      {error ? (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      ) : null}

      {totalQuestions > 1 ? (
        <nav
          className="guest-exam-palette mb-4 grid grid-cols-5 gap-1.5 min-[380px]:grid-cols-6 sm:flex sm:flex-wrap sm:gap-1.5"
          aria-label="Question navigator"
        >
          {exam.questions.map((q, idx) => {
            const answered = Boolean(answers[q.id]?.trim());
            const active = idx === currentIndex;
            return (
              <button
                key={q.id}
                type="button"
                disabled={submitting || !userName}
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  'flex h-9 min-w-0 items-center justify-center rounded-[var(--radius-sm)] text-xs font-bold transition-colors sm:size-8 sm:h-8',
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
        <section className="guest-exam-card rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-elevated)] p-3.5 sm:p-6">
          <div className="flex items-center justify-between gap-2 text-xs text-[var(--muted-strong)] sm:text-sm">
            <span className="font-medium">
              Question {currentIndex + 1} of {exam.totalQuestions}
            </span>
            <span className="tabular-nums">
              Answered {answeredCount}/{exam.totalQuestions}
            </span>
          </div>

          <h2 className="type-prose-title mt-3 break-words font-reading text-[1.05rem] leading-relaxed font-medium text-[var(--ink)] sm:mt-4 sm:text-xl">
            {question.questionText}
          </h2>

          <div className="mt-4 grid gap-2.5 sm:mt-5 sm:gap-2.5" role="radiogroup" aria-label="Options">
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
                    'flex min-h-12 w-full items-start gap-3 rounded-[var(--radius)] border px-3 py-3 text-left transition-colors active:scale-[0.99] sm:min-h-0 sm:px-3.5',
                    selected
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_35%,transparent)]'
                      : 'border-[var(--line)] bg-[var(--bg)] hover:border-[var(--accent)]/40 hover:bg-[var(--brand-wash)]',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:size-7',
                      selected
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                        : 'bg-[var(--bg-muted)] text-[var(--muted-strong)]',
                    )}
                    aria-hidden
                  >
                    {label}
                  </span>
                  <span className="type-mcq-option min-w-0 flex-1 break-words font-reading text-[0.9375rem] leading-relaxed text-[var(--ink)] sm:text-[0.95rem]">
                    {option}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-6 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full sm:h-10 sm:w-auto"
              disabled={!canGoPrev}
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            >
              Previous
            </Button>

            {canGoNext ? (
              <Button
                type="button"
                className="h-11 w-full sm:h-10 sm:w-auto"
                disabled={!canGoNext}
                onClick={() => setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1))}
              >
                Next
              </Button>
            ) : (
              <div className="hidden sm:block" aria-hidden />
            )}

            {allAnswered ? (
              <Button
                type="button"
                variant="primary"
                className={cn(
                  'guest-exam-submit h-11 w-full motion-fade-in sm:h-10 sm:w-auto',
                  !isLast && 'col-span-2 sm:ml-auto',
                  isLast && !canGoNext && 'col-span-1',
                )}
                disabled={!userName || submitting}
                onClick={() => void submit(false, elapsedSeconds)}
              >
                {submitting ? 'Submitting…' : 'Submit exam'}
              </Button>
            ) : null}
          </div>

          {!allAnswered ? (
            <p className="mt-3 text-center text-xs text-[var(--muted)] sm:text-left">
              Answer every question to unlock Submit ({answeredCount}/{totalQuestions}).
            </p>
          ) : null}
        </section>
      ) : (
        <Alert variant="warning" className="mt-4">
          This exam has no questions yet.
        </Alert>
      )}
    </div>
  );
}
