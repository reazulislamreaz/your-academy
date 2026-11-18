'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PublicExamDetail } from '@your-academy/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/client';
import { submitPublicExamAttempt } from '@/lib/api/exams';
import { cn } from '@/lib/utils';
import { NameEntryModal } from './name-entry-modal';
import { useExamCountdown } from './use-exam-countdown';

type Props = {
  exam: PublicExamDetail;
};

export function GuestExamPlayer({ exam }: Props) {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const running = Boolean(userName) && !submitting;

  const submit = useCallback(
    async (timedOut: boolean, elapsedSeconds: number) => {
      if (!userName || submitting) return;
      setSubmitting(true);
      setError(null);
      try {
        const result = await submitPublicExamAttempt(exam.id, {
          userName,
          userAnswers: answers,
          elapsedSeconds,
          timedOut,
        });
        router.push(`/exams/${exam.slug}/result/${result.attemptId}`);
      } catch (err) {
        setSubmitting(false);
        setError(err instanceof ApiError ? err.message : 'Could not submit exam. Please try again.');
      }
    },
    [answers, exam.id, exam.slug, router, submitting, userName],
  );

  const { display, remainingSeconds, elapsedSeconds } = useExamCountdown({
    durationInMinutes: exam.durationInMinutes,
    running,
    onExpire: () => {
      void submit(true, exam.durationInMinutes * 60);
    },
  });

  const question = exam.questions[currentIndex];
  const answeredCount = useMemo(
    () => exam.questions.filter((q) => Boolean(answers[q.id])).length,
    [answers, exam.questions],
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <NameEntryModal
        examTitle={exam.title}
        open={!userName}
        onStart={(name) => setUserName(name)}
      />

      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div className="min-w-0">
          <p className="text-[0.7rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
            Live exam
          </p>
          <h1 className="font-display text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
            {exam.title}
          </h1>
          {userName ? (
            <p className="mt-1 text-sm text-[var(--muted-strong)]">Candidate: {userName}</p>
          ) : null}
        </div>
        <div
          className={cn(
            'rounded-[var(--radius)] border px-3 py-2 text-center tabular-nums',
            remainingSeconds <= 60
              ? 'border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger-fg)]'
              : 'border-[var(--line)] bg-[var(--bg-elevated)] text-[var(--ink)]',
          )}
          aria-live="polite"
          aria-label={`Time remaining ${display}`}
        >
          <p className="text-[0.65rem] font-semibold tracking-wide text-[var(--muted)] uppercase">
            Time left
          </p>
          <p className="font-display text-2xl font-bold leading-none">{display}</p>
        </div>
      </header>

      {error ? (
        <Alert variant="danger" className="mt-4">
          {error}
        </Alert>
      ) : null}

      {question ? (
        <section className="mt-6">
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

          <div className="mt-5 grid gap-2.5">
            {question.options.map((option, idx) => {
              const selected = answers[question.id] === option;
              const label = String.fromCharCode(65 + idx);
              return (
                <button
                  key={`${question.id}-${idx}`}
                  type="button"
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
            {currentIndex < exam.questions.length - 1 ? (
              <Button
                type="button"
                disabled={submitting}
                onClick={() => setCurrentIndex((i) => Math.min(exam.questions.length - 1, i + 1))}
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                disabled={!userName || submitting}
                onClick={() => void submit(false, elapsedSeconds)}
              >
                {submitting ? 'Submitting…' : 'Submit exam'}
              </Button>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
