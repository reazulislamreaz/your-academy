'use client';

import Link from 'next/link';
import { Clock3, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Surface } from '@/components/ui/surface';
import type { PracticeSetListItem } from '@/lib/api/types';
import type { PublicExamListItem } from '@your-academy/shared';
import { practiceKindLabel } from '@/lib/exam-tags';

type Props = {
  practiceSets: PracticeSetListItem[];
  publicExams: PublicExamListItem[];
  loading?: boolean;
};

function minutesFromSeconds(seconds: number | null | undefined): string | null {
  if (seconds == null || seconds <= 0) return null;
  return `${Math.max(1, Math.round(seconds / 60))} Mins`;
}

/** Quick-start widgets for latest practice sets + public guest exams. */
export function RecommendedExams({ practiceSets, publicExams, loading }: Props) {
  const sets = practiceSets.slice(0, 3);
  const guests = publicExams.slice(0, 3);
  const empty = !loading && sets.length === 0 && guests.length === 0;

  return (
    <Surface elevated className="space-y-4 overflow-x-clip p-3.5 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold tracking-tight text-[var(--ink)] sm:text-lg">
            Recommended exams
          </h2>
          <p className="mt-0.5 text-sm text-pretty text-[var(--muted)]">
            Jump into the newest published sets
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-semibold">
          <Link
            href="/live-quizzes"
            className="text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Quiz
          </Link>
          <Link
            href="/live-model-tests"
            className="text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Model Test
          </Link>
          <Link
            href="/preli-practice"
            className="text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Preli Practice
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading recommendations…</p>
      ) : null}

      {empty ? (
        <EmptyState
          nested
          className="py-8"
          title="No published exams yet"
          description="New quizzes and live exams will appear here when available."
          action={
            <Link href="/questions">
              <Button size="sm" variant="soft">
                Browse question bank
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map((set) => (
            <article
              key={set.id}
              className="motion-hover-lift flex flex-col rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg)] p-3.5 transition-shadow duration-300"
            >
              <p className="text-[0.65rem] font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
                {practiceKindLabel(set.kind)}
              </p>
              <h3 className="mt-1 line-clamp-2 font-display text-sm font-semibold tracking-tight text-[var(--ink)]">
                {set.title}
              </h3>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--muted-strong)]">
                {minutesFromSeconds(set.durationSeconds) ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="size-3.5" aria-hidden />
                    {minutesFromSeconds(set.durationSeconds)}
                  </span>
                ) : (
                  <span>Untimed</span>
                )}
                <span className="inline-flex items-center gap-1">
                  <ListChecks className="size-3.5" aria-hidden />
                  {set.questionCount} Q
                </span>
              </div>
              <div className="mt-auto pt-4">
                <Link href={`/practice/${set.slug}`}>
                  <Button size="sm" className="h-10 w-full">
                    Start exam
                  </Button>
                </Link>
              </div>
            </article>
          ))}
          {guests.map((exam) => (
            <article
              key={exam.id}
              className="motion-hover-lift flex flex-col rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg)] p-3.5 transition-shadow duration-300"
            >
              <p className="text-[0.65rem] font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
                Live exam
              </p>
              <h3 className="mt-1 line-clamp-2 font-display text-sm font-semibold tracking-tight text-[var(--ink)]">
                {exam.title}
              </h3>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--muted-strong)]">
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="size-3.5" aria-hidden />
                  {exam.durationInMinutes} Mins
                </span>
                <span className="inline-flex items-center gap-1">
                  <ListChecks className="size-3.5" aria-hidden />
                  {exam.totalQuestions} Q
                </span>
              </div>
              <div className="mt-auto pt-4">
                <Link href={`/live-quizzes/${exam.slug}`}>
                  <Button size="sm" variant="outline" className="h-10 w-full">
                    Start exam
                  </Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </Surface>
  );
}
