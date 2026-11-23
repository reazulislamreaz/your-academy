'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { scrollExamToTop } from '@/features/guest-exams/scroll-exam-to-top';
import { useExamCountdown } from '@/features/guest-exams/use-exam-countdown';
import { ModelTestSubmitDialog } from '@/features/model-tests/model-test-submit-dialog';
import { ApiError } from '@/lib/api/client';
import { getPublicQuestionSet } from '@/lib/api/public-questions';
import { cn } from '@/lib/utils';
import { loadAllPreliSetQuestions } from './load-preli-set-questions';
import {
  clearPreliPracticeSession,
  loadPreliPracticeSession,
  savePreliPracticeResult,
  savePreliPracticeSession,
} from './preli-practice-session';
import { scorePreliPractice } from './score-preli-practice';

type Props = {
  setId: string;
  /** Listing / take / result URL prefix (learner: `/preli-practice`). */
  basePath?: string;
};

const BN_LABELS = ['ক', 'খ', 'গ', 'ঘ'] as const;

/** Timed Preli Practice player — Model Test chrome, client-side scoring, no name gate. */
export function PreliPracticePlayer({ setId, basePath = '/preli-practice' }: Props) {
  const router = useRouter();
  const takeBase = basePath.replace(/\/$/, '') || '/preli-practice';
  const [hydrated, setHydrated] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const submittingRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const durationRef = useRef(durationMinutes);
  durationRef.current = durationMinutes;

  const setQry = useQuery({
    queryKey: ['public-question-set', setId],
    queryFn: () => getPublicQuestionSet(setId),
  });

  const questionsQry = useQuery({
    queryKey: ['preli-practice-questions', setId],
    queryFn: () => loadAllPreliSetQuestions(setId),
    staleTime: 60_000,
  });

  useEffect(() => {
    const saved = loadPreliPracticeSession(setId);
    if (!saved) {
      setHydrated(true);
      return;
    }
    setDurationMinutes(saved.durationMinutes);
    setStartedAtMs(saved.startedAtMs);
    setAnswers(saved.answers);
    setHydrated(true);
  }, [setId]);

  // No session → user opened take URL directly; send back to listing.
  useEffect(() => {
    if (!hydrated) return;
    if (durationMinutes == null || startedAtMs == null) {
      router.replace(takeBase);
    }
  }, [durationMinutes, hydrated, router, startedAtMs, takeBase]);

  useEffect(() => {
    if (!hydrated || durationMinutes == null || startedAtMs == null) return;
    const title = setQry.data?.title ?? loadPreliPracticeSession(setId)?.setTitle ?? 'Preli Practice';
    savePreliPracticeSession({
      setId,
      setTitle: title,
      durationMinutes,
      startedAtMs,
      answers,
    });
  }, [answers, durationMinutes, hydrated, setId, setQry.data?.title, startedAtMs]);

  useEffect(() => {
    if (hydrated && durationMinutes != null && startedAtMs != null) {
      scrollExamToTop('pp-q-1');
    }
  }, [durationMinutes, hydrated, startedAtMs]);

  const questions = questionsQry.data ?? [];
  const setTitle = setQry.data?.title ?? 'Preli Practice';

  const submit = useCallback(
    async (timedOut: boolean, elapsedSeconds: number) => {
      if (submittingRef.current) return;
      const duration = durationRef.current;
      if (duration == null) return;
      if (!questionsQry.data) {
        setError('Questions are still loading. Please wait a moment.');
        return;
      }
      submittingRef.current = true;
      setSubmitting(true);
      setConfirmOpen(false);
      setError(null);
      try {
        const result = await scorePreliPractice({
          setId,
          setTitle,
          durationMinutes: duration,
          elapsedSeconds,
          timedOut,
          questions: questionsQry.data,
          answers: answersRef.current,
        });
        savePreliPracticeResult(result);
        clearPreliPracticeSession(setId);
        router.push(`${takeBase}/${encodeURIComponent(setId)}/result`);
      } catch (err) {
        submittingRef.current = false;
        setSubmitting(false);
        setError(
          err instanceof ApiError ? err.message : 'Could not finish this practice. Please try again.',
        );
      }
    },
    [questionsQry.data, router, setId, setTitle, takeBase],
  );

  const { display, remainingSeconds, elapsedSeconds, isExpired } = useExamCountdown({
    durationInMinutes: durationMinutes ?? 0,
    startedAtMs,
    onExpire: () => {
      const mins = durationRef.current ?? 1;
      void submit(true, Math.max(1, mins) * 60);
    },
  });

  useEffect(() => {
    if (!hydrated || !startedAtMs || submittingRef.current) return;
    if (isExpired) {
      const mins = durationRef.current ?? 1;
      void submit(true, Math.max(1, mins) * 60);
    }
  }, [hydrated, isExpired, startedAtMs, submit]);

  const totalQuestions = questions.length;
  const answeredCount = useMemo(
    () => questions.filter((q) => Boolean(answers[q.id]?.trim())).length,
    [answers, questions],
  );
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);
  const allAnswered = totalQuestions > 0 && unansweredCount === 0;

  const selectAnswer = (questionId: string, optionId: string) => {
    if (submitting || startedAtMs == null) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const requestSubmit = () => {
    if (submitting || startedAtMs == null) return;
    if (!allAnswered) {
      setConfirmOpen(true);
      return;
    }
    void submit(false, elapsedSeconds);
  };

  if (!hydrated || durationMinutes == null || startedAtMs == null) {
    return (
      <div className="mx-auto flex min-h-[40vh] w-full max-w-3xl items-center justify-center px-4">
        <p className="text-sm text-[var(--muted)]">Loading Preli Practice…</p>
      </div>
    );
  }

  if (setQry.isError || questionsQry.isError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <Alert variant="danger">
          Could not load this question set.{' '}
          <button
            type="button"
            className="font-semibold underline-offset-2 hover:underline"
            onClick={() => {
              void setQry.refetch();
              void questionsQry.refetch();
            }}
          >
            Retry
          </button>
        </Alert>
      </div>
    );
  }

  if (setQry.isLoading || questionsQry.isLoading) {
    return (
      <div className="mx-auto flex min-h-[40vh] w-full max-w-3xl items-center justify-center px-4">
        <p className="text-sm text-[var(--muted)]">Loading questions…</p>
      </div>
    );
  }

  return (
    <div className="guest-exam-player mx-auto w-full max-w-3xl overflow-x-clip px-3 py-4 sm:px-6 sm:py-8">
      <ModelTestSubmitDialog
        open={confirmOpen}
        unanswered={unansweredCount}
        total={totalQuestions}
        pending={submitting}
        onSkipAndSubmit={() => void submit(false, elapsedSeconds)}
        onGoBack={() => setConfirmOpen(false)}
      />

      <header className="guest-exam-chrome sticky top-[calc(var(--header-h,4.5rem)+0.25rem)] z-20 mb-4 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-elevated)_94%,transparent)] px-3 py-2.5 shadow-[var(--shadow-sm)] backdrop-blur-md sm:mb-5 sm:px-4 sm:py-3">
        <div className="flex items-start justify-between gap-2.5 sm:items-center sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[0.625rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase sm:text-[0.65rem]">
              Preli Practice
            </p>
            <h1 className="mt-0.5 truncate font-display text-base font-bold tracking-tight text-[var(--ink)] sm:text-xl">
              {setTitle}
            </h1>
            <p className="mt-0.5 text-xs text-[var(--muted-strong)] sm:text-sm">
              {durationMinutes} min practice
            </p>
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
              Answered {answeredCount}/{totalQuestions}
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
        <Alert variant="warning">This set has no published questions yet.</Alert>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {questions.map((question, qIndex) => {
            const selected = answers[question.id];
            const stem = question.content?.trim() || question.title;
            return (
              <section
                key={question.id}
                id={`pp-q-${qIndex + 1}`}
                className="guest-exam-card rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-elevated)] p-3.5 shadow-[var(--shadow-sm)] sm:p-6"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-[var(--muted-strong)] sm:text-sm">
                  <span className="font-medium">
                    Question {qIndex + 1} of {totalQuestions}
                  </span>
                  {selected ? (
                    <span className="font-medium text-[var(--accent)]">Answered</span>
                  ) : (
                    <span>Unanswered</span>
                  )}
                </div>

                <h2 className="type-prose-title mt-3 break-words font-reading text-[1.05rem] leading-relaxed font-medium text-[var(--ink)] sm:mt-4 sm:text-xl">
                  {stem}
                </h2>

                <div
                  className="mt-4 grid gap-2.5 sm:mt-5"
                  role="radiogroup"
                  aria-label={`Options for question ${qIndex + 1}`}
                >
                  {question.options.map((option, idx) => {
                    const isSelected = selected === option.id;
                    const label = BN_LABELS[idx] ?? option.label ?? String.fromCharCode(65 + idx);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        disabled={submitting}
                        onClick={() => selectAnswer(question.id, option.id)}
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
                          {option.content}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <footer className="sticky bottom-0 z-10 -mx-3 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-desk)_92%,transparent)] px-3 py-3 backdrop-blur-md sm:-mx-0 sm:rounded-[var(--radius-lg)] sm:border sm:px-4 sm:py-4">
            <Button
              type="button"
              variant="primary"
              className="guest-exam-submit h-12 w-full sm:h-11"
              disabled={submitting || totalQuestions === 0}
              onClick={requestSubmit}
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </Button>
            {!allAnswered ? (
              <p className="mt-2 text-center text-xs text-[var(--muted-strong)] sm:text-sm">
                {unansweredCount} unanswered — you can still submit.
              </p>
            ) : null}
          </footer>
        </div>
      )}
    </div>
  );
}
