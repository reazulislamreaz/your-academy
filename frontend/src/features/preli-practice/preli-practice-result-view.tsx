'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PreliPracticeResult } from './preli-practice-session';

type Props = {
  result: PreliPracticeResult;
  /** Listing URL prefix (learner: `/preli-practice`). */
  basePath?: string;
};

/** Preli Practice result + answer sheet — same visual language as Model Test results. */
export function PreliPracticeResultView({ result, basePath = '/preli-practice' }: Props) {
  const [showSheet, setShowSheet] = useState(true);
  const circumference = 2 * Math.PI * 54;
  const progress = Math.min(100, Math.max(0, result.percent));
  const dash = (progress / 100) * circumference;
  const takeBase = basePath.replace(/\/$/, '') || '/preli-practice';
  const retakeHref = `${takeBase}/${encodeURIComponent(result.setId)}`;

  return (
    <div className="mx-auto w-full max-w-3xl overflow-x-clip px-3 py-6 sm:px-6 sm:py-10">
      <section className="rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 sm:p-8">
        <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase sm:text-[0.7rem]">
          Result overview
        </p>
        <h1 className="mt-1 font-display text-xl font-bold tracking-tight break-words text-[var(--ink)] sm:text-2xl">
          {result.setTitle}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-strong)]">
          Preli Practice
          {result.timedOut ? ' · Submitted on timeout' : null}
          {` · ${result.durationMinutes} min limit`}
        </p>

        <div className="mt-6 flex flex-col items-center gap-5 sm:mt-8 sm:flex-row sm:justify-center sm:gap-10">
          <div className="relative size-28 sm:size-36">
            <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
              <circle cx="60" cy="60" r="54" fill="none" stroke="var(--line)" strokeWidth="10" />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circumference}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-2xl font-bold text-[var(--ink)] sm:text-3xl">
                {result.percent}%
              </span>
            </div>
          </div>
          <div className="text-center sm:text-left">
            <p className="font-display text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
              {result.score}
              <span className="text-xl text-[var(--muted)] sm:text-2xl">
                /{result.totalQuestions}
              </span>
            </p>
            <p className="mt-2 text-sm text-[var(--muted-strong)]">
              Correct {result.correctCount} · Wrong {result.wrongCount} · Unanswered{' '}
              {result.skippedCount}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Marks {result.score}/{result.totalQuestions}
            </p>
          </div>
        </div>
      </section>

      <div className="mt-4 flex justify-center sm:mt-6">
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full max-w-sm sm:h-10 sm:w-auto"
          onClick={() => setShowSheet((v) => !v)}
          aria-expanded={showSheet}
        >
          {showSheet ? 'Hide question review' : 'Show question review'}
        </Button>
      </div>

      {showSheet ? (
        <section className="mt-4 space-y-3 sm:mt-6 sm:space-y-4" aria-label="Answer sheet">
          {result.answerSheet.map((item, index) => (
            <article
              key={item.id}
              className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-3.5 sm:p-5"
            >
              <p className="text-xs font-semibold text-[var(--muted)]">Question {index + 1}</p>
              <h3 className="mt-1 font-reading text-[0.9375rem] leading-relaxed font-medium break-words text-[var(--ink)] sm:text-base">
                {item.questionText}
              </h3>
              <ul className="mt-3 space-y-1.5">
                {item.options.map((option, optIdx) => {
                  const isSelected = item.selectedOptionId === option.id;
                  const isCorrect = item.correctOptionId === option.id;
                  const letter =
                    ['ক', 'খ', 'গ', 'ঘ'][optIdx] ?? option.label ?? String.fromCharCode(65 + optIdx);
                  return (
                    <li
                      key={option.id}
                      className={cn(
                        'rounded-[var(--radius)] border px-2.5 py-2 text-sm break-words font-reading sm:px-3',
                        isCorrect &&
                          'border-[var(--success)] bg-[var(--success-soft)] text-[var(--success-fg)]',
                        isSelected &&
                          !isCorrect &&
                          'border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger-fg)]',
                        !isSelected && !isCorrect && 'border-transparent text-[var(--ink-soft)]',
                      )}
                    >
                      <span className="mr-2 font-semibold opacity-70">{letter}.</span>
                      {option.content}
                      {isSelected ? (
                        <span className="mt-1 block text-xs font-semibold sm:mt-0 sm:ml-2 sm:inline">
                          {isCorrect ? 'Your answer · Correct' : 'Your answer'}
                        </span>
                      ) : null}
                      {!isSelected && isCorrect ? (
                        <span className="mt-1 block text-xs font-semibold sm:mt-0 sm:ml-2 sm:inline">
                          Correct answer
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              {item.isSkipped ? (
                <p className="mt-2 text-xs font-semibold text-[var(--warning-fg)]">Unanswered</p>
              ) : null}
              {item.explanation ? (
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted-strong)]">
                  <span className="font-semibold text-[var(--ink)]">Explanation: </span>
                  {item.explanation}
                </p>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      <section className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap">
        <Link href={takeBase} className="w-full sm:w-auto">
          <Button variant="outline" className="h-11 w-full sm:h-10 sm:w-auto">
            Back to Preli Sets
          </Button>
        </Link>
        <Link href={retakeHref} className="w-full sm:w-auto">
          <Button variant="primary" className="h-11 w-full sm:h-10 sm:w-auto">
            Retake
          </Button>
        </Link>
        <Link href="/home" className="w-full sm:w-auto">
          <Button variant="soft" className="h-11 w-full sm:h-10 sm:w-auto">
            Dashboard
          </Button>
        </Link>
      </section>
    </div>
  );
}
