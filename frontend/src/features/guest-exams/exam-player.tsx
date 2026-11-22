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
import { scrollExamToTop } from './scroll-exam-to-top';
import { useExamCountdown } from './use-exam-countdown';
import { useTimedExamCandidate } from './use-timed-exam-candidate';

type Props = {
  exam: PublicExamDetail;
};

export function GuestExamPlayer({ exam }: Props) {
  const router = useRouter();
  const { accountName, canAutoStart, shouldPromptName } = useTimedExamCandidate();
  const [hydrated, setHydrated] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
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
    }
    setHydrated(true);
  }, [exam.id]);

  const startExam = useCallback(
    (name: string) => {
      const now = Date.now();
      setUserName(name);
      setStartedAtMs(now);
      saveGuestExamSession({
        examId: exam.id,
        userName: name,
        startedAtMs: now,
        answers: {},
      });
      scrollExamToTop('exam-q-1');
    },
    [exam.id],
  );

  // Authenticated users: skip name modal; always use account display name.
  useEffect(() => {
    if (!hydrated || !canAutoStart) return;
    if (!userName) {
      startExam(accountName);
      return;
    }
    if (userName !== accountName) setUserName(accountName);
  }, [accountName, canAutoStart, hydrated, startExam, userName]);

  useEffect(() => {
    if (!hydrated || !userName || !startedAtMs) return;
    saveGuestExamSession({
      examId: exam.id,
      userName,
      startedAtMs,
      answers,
    });
  }, [answers, exam.id, hydrated, startedAtMs, userName]);

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

  const totalQuestions = exam.questions.length;

  const answeredCount = useMemo(
    () => exam.questions.filter((q) => Boolean(answers[q.id]?.trim())).length,
    [answers, exam.questions],
  );

  const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions;

  const selectAnswer = (questionId: string, option: string) => {
    if (submitting || !userName) return;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
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
        open={!userName && shouldPromptName}
        durationInMinutes={exam.durationInMinutes}
        totalQuestions={exam.totalQuestions}
        onStart={startExam}
      />

      <header className="guest-exam-chrome sticky top-[calc(var(--header-h,4.5rem)+0.25rem)] z-20 mb-4 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-elevated)_94%,transparent)] px-3 py-2.5 shadow-[var(--shadow-sm)] backdrop-blur-md sm:mb-5 sm:px-4 sm:py-3">
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
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <div
              className={cn(
                'rounded-[var(--radius)] border px-2.5 py-1.5 text-center tabular-nums sm:px-3 sm:py-2',
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
            <p className="text-[0.7rem] font-medium tabular-nums text-[var(--muted-strong)] sm:text-xs">
              Answered {answeredCount}/{exam.totalQuestions}
            </p>
          </div>
        </div>
      </header>

      {error ? (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      ) : null}

      {totalQuestions === 0 ? (
        <Alert variant="warning">This exam has no questions yet.</Alert>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {exam.questions.map((question, qIndex) => {
            const selected = answers[question.id];
            return (
              <section
                key={question.id}
                id={`exam-q-${qIndex + 1}`}
                className="guest-exam-card rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-elevated)] p-3.5 shadow-[var(--shadow-sm)] sm:p-6"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-[var(--muted-strong)] sm:text-sm">
                  <span className="font-medium">
                    Question {qIndex + 1} of {exam.totalQuestions}
                  </span>
                  {selected ? (
                    <span className="font-medium text-[var(--accent)]">Answered</span>
                  ) : (
                    <span>Unanswered</span>
                  )}
                </div>

                <h2 className="type-prose-title mt-3 break-words font-reading text-[1.05rem] leading-relaxed font-medium text-[var(--ink)] sm:mt-4 sm:text-xl">
                  {question.questionText}
                </h2>

                <div
                  className="mt-4 grid gap-2.5 sm:mt-5"
                  role="radiogroup"
                  aria-label={`Options for question ${qIndex + 1}`}
                >
                  {question.options.map((option, idx) => {
                    const isSelected = selected === option;
                    const label = String.fromCharCode(65 + idx);
                    return (
                      <button
                        key={`${question.id}-${idx}`}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        disabled={submitting || !userName}
                        onClick={() => selectAnswer(question.id, option)}
                        className={cn(
                          'flex min-h-12 w-full items-start gap-3 rounded-[var(--radius)] border px-3 py-3 text-left transition-[border-color,background-color,box-shadow,transform] duration-150 active:scale-[0.995] sm:min-h-0 sm:px-3.5',
                          isSelected
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_35%,transparent)]'
                            : 'border-[var(--line)] bg-[var(--bg)] hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--line))] hover:bg-[var(--brand-wash)]',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:size-7',
                            isSelected
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
              </section>
            );
          })}

          <footer className="sticky bottom-0 z-10 -mx-3 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-desk)_92%,transparent)] px-3 py-3 backdrop-blur-md sm:-mx-0 sm:rounded-[var(--radius-lg)] sm:border sm:px-4 sm:py-4">
            {allAnswered ? (
              <Button
                type="button"
                variant="primary"
                className="guest-exam-submit h-12 w-full motion-fade-in sm:h-11"
                disabled={!userName || submitting}
                onClick={() => void submit(false, elapsedSeconds)}
              >
                {submitting ? 'Submitting…' : 'Submit exam'}
              </Button>
            ) : (
              <p className="text-center text-xs leading-relaxed text-[var(--muted-strong)] sm:text-sm">
                Answer every question to unlock Submit ({answeredCount}/{totalQuestions}).
              </p>
            )}
          </footer>
        </div>
      )}
    </div>
  );
}
