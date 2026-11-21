'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ExamAttemptResult } from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { useMe } from '@/features/auth/use-auth';
import { GuestRegisterCta } from '@/features/guest-exams/guest-register-cta';
import { cn } from '@/lib/utils';

type Props = {
  result: ExamAttemptResult;
};

export function ExamResultView({ result }: Props) {
  const me = useMe();
  const isGuest = !me.data && !me.isLoading;
  const [showSheet, setShowSheet] = useState(false);
  const circumference = 2 * Math.PI * 54;
  const progress = Math.min(100, Math.max(0, result.percent));
  const dash = (progress / 100) * circumference;
  const resultPath = `/exams/${encodeURIComponent(result.exam.slug)}/result/${encodeURIComponent(result.attemptId)}`;

  return (
    <div className="mx-auto w-full max-w-3xl overflow-x-clip px-3 py-6 sm:px-6 sm:py-10">
      <section className="rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 sm:p-8">
        <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase sm:text-[0.7rem]">
          Result
        </p>
        <h1 className="mt-1 font-display text-xl font-bold tracking-tight break-words text-[var(--ink)] sm:text-2xl">
          {result.exam.title}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-strong)]">
          Candidate: <span className="font-semibold text-[var(--ink)]">{result.userName}</span>
          {result.timedOut ? ' · Submitted on timeout' : null}
        </p>

        <div className="mt-6 flex flex-col items-center gap-5 sm:mt-8 sm:flex-row sm:justify-center sm:gap-10">
          <div className="relative size-28 sm:size-36">
            <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="var(--line)"
                strokeWidth="10"
              />
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
                /{result.exam.totalQuestions}
              </span>
            </p>
            <p className="mt-2 text-sm text-[var(--muted-strong)]">
              Correct {result.correctCount} · Wrong {result.wrongCount}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-center sm:mt-8">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full max-w-sm sm:h-10 sm:w-auto"
            onClick={() => setShowSheet((v) => !v)}
            aria-expanded={showSheet}
          >
            {showSheet ? 'Hide answer sheet preview' : 'Show answer sheet preview'}
          </Button>
        </div>
      </section>

      {isGuest ? (
        <GuestRegisterCta
          className="mt-4 sm:mt-6"
          link={{
            kind: 'exam',
            attemptId: result.attemptId,
            resultPath,
            title: result.exam.title,
            score: result.score,
            totalQuestions: result.exam.totalQuestions,
            percent: result.percent,
            userName: result.userName,
          }}
        />
      ) : null}

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
                  const isSelected = item.selectedAnswer === option;
                  const isCorrect = item.correctAnswer === option;
                  const letter = String.fromCharCode(65 + optIdx);
                  return (
                    <li
                      key={`${item.id}-opt-${optIdx}`}
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
                      {option}
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
                <p className="mt-2 text-xs font-semibold text-[var(--warning-fg)]">Skipped</p>
              ) : null}
              {item.explanation ? (
                <p className="mt-3 text-sm leading-relaxed break-words text-[var(--muted-strong)]">
                  <span className="font-semibold text-[var(--ink)]">Explanation: </span>
                  {item.explanation}
                </p>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      <section className="guest-exam-cta mt-6 rounded-[var(--radius-xl)] border border-[var(--line)] p-4 sm:mt-8 sm:p-7">
        <h2 className="font-display text-lg font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
          আপনার আজকের প্রোগ্রেস ও স্কোর সেভ করা হয়েছে!
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted-strong)] sm:text-base">
          প্রতিদিন এমন আরও এক্সক্লুসিভ এক্সাম দিয়ে নিজের প্রস্তুতি ঝালাই করতে এবং লিডারবোর্ডে নিজের
          নাম দেখতে আজই <strong className="text-[var(--ink)]">Your Academy</strong>-তে ফ্রি
          রেজিস্ট্রেশন করুন।
        </p>
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <Link href="/register" className="w-full sm:w-auto">
            <Button className="h-11 w-full sm:h-10 sm:w-auto">Register Now</Button>
          </Link>
          <Link href="/exams" className="w-full sm:w-auto">
            <Button variant="outline" className="h-11 w-full sm:h-10 sm:w-auto">
              Explore More Exams
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
