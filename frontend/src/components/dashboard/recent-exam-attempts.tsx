'use client';

import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Surface } from '@/components/ui/surface';
import type { ExamPerformance } from '@/lib/api/types';
import { practiceKindLabel } from '@/lib/exam-tags';

type Props = {
  recentExams: ExamPerformance['recentExams'];
};

function scoreLabel(exam: ExamPerformance['recentExams'][number]): string {
  if (exam.score != null && exam.maxScore != null) {
    return `${exam.score}/${exam.maxScore}`;
  }
  if (exam.percentScore != null) return `${exam.percentScore}%`;
  return '—';
}

/** Recent practice/model-test attempts with deep links to result sheets. */
export function RecentExamAttempts({ recentExams }: Props) {
  return (
    <Surface elevated className="space-y-4 overflow-x-clip p-3.5 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold tracking-tight text-[var(--ink)] sm:text-lg">
            Recent exam attempts
          </h2>
          <p className="mt-0.5 text-sm text-pretty text-[var(--muted)]">
            Your latest timed quizzes and model tests
          </p>
        </div>
        <Link
          href="/results"
          className="shrink-0 self-start text-xs font-semibold text-[var(--accent)] underline-offset-2 hover:underline sm:self-auto"
        >
          View all results
        </Link>
      </div>

      {recentExams.length === 0 ? (
        <EmptyState
          nested
          align="center"
          className="px-3 py-8 sm:px-6 sm:py-10"
          title="No exams yet"
          description="Take a quiz or model test to build your history and unlock answer-sheet review."
          action={
            <Link href="/live-quizzes">
              <Button size="sm" className="min-h-10">
                <ClipboardList className="size-4" aria-hidden />
                Explore exams
              </Button>
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {recentExams.slice(0, 6).map((exam) => (
            <li
              key={exam.id}
              className="flex flex-col gap-3 py-3.5 first:pt-1 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{practiceKindLabel(exam.kind)}</Badge>
                  <Badge variant={exam.status === 'SUBMITTED' ? 'success' : 'outline'}>
                    {exam.status}
                  </Badge>
                </div>
                <p className="truncate font-display text-sm font-semibold tracking-tight text-[var(--ink)] sm:text-[0.95rem]">
                  {exam.title}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {exam.submittedAt
                    ? new Date(exam.submittedAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : 'In progress'}
                  <span className="mx-1.5 text-[var(--line-strong)]">·</span>
                  <span className="font-semibold tabular-nums text-[var(--ink-soft)]">
                    {scoreLabel(exam)}
                  </span>
                  {exam.percentScore != null && exam.score != null ? (
                    <span className="text-[var(--muted)]"> ({exam.percentScore}%)</span>
                  ) : null}
                </p>
              </div>
              <Link href={`/results/${exam.id}`} className="shrink-0">
                <Button variant="outline" size="sm" className="h-10 w-full sm:w-auto">
                  View result & answer sheet
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
}
