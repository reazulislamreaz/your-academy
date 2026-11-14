'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AccuracyDonut } from '@/components/dashboard/accuracy-donut';
import { BarChart } from '@/components/dashboard/bar-chart';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Surface } from '@/components/ui/surface';
import { apiFetch } from '@/lib/api/client';
import type { ExamPerformance } from '@/lib/api/types';
import { practiceKindLabel } from '@/lib/exam-tags';

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Surface elevated className="p-4">
      <p className="text-xs text-[var(--muted-strong)]">{label}</p>
      <p className="mt-1 font-display text-xl font-bold tabular-nums text-[var(--ink)]">{value}</p>
    </Surface>
  );
}

type Props = {
  initial?: ExamPerformance | null;
  compact?: boolean;
};

export function ExamPerformancePanel({ initial, compact }: Props) {
  const examQ = useQuery({
    queryKey: ['exam-performance'],
    queryFn: () => apiFetch<ExamPerformance>('/me/exam-performance'),
    enabled: initial == null,
    staleTime: 30_000,
  });

  const data = initial ?? examQ.data;

  if (examQ.isLoading && !data) {
    return (
      <Surface className="p-5 text-sm text-[var(--muted-strong)]">Loading exam performance…</Surface>
    );
  }

  if (examQ.isError && !data) {
    return <Alert variant="danger">Could not load exam performance.</Alert>;
  }

  if (!data) return null;

  const trendBars = data.scoreTrend.slice(-8).map((row, i) => ({
    label: `E${i + 1}`,
    value: row.percentScore,
  }));

  const subjectBars = data.bySubject.slice(0, 6).map((s) => ({
    label: s.name.slice(0, 12),
    value: s.averagePercent,
  }));

  return (
    <div id="exam-history" className="scroll-mt-24 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight text-[var(--ink)]">
            Exam performance
          </h2>
          <p className="text-sm text-[var(--muted-strong)]">
            Timed quizzes and model tests permanently saved to your account.
          </p>
        </div>
        <Link
          href="/results"
          className="text-xs font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
        >
          Full exam history
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Exams completed" value={String(data.totalExamsCompleted)} />
        <MiniStat label="Avg score" value={`${data.averageExamScorePercent}%`} />
        <MiniStat label="Best score" value={`${data.highestExamScorePercent}%`} />
        <MiniStat label="Time in exams" value={formatDuration(data.totalTimeSpentSeconds)} />
      </div>

      {!compact ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat label="MCQs attempted" value={String(data.totalQuestionsAttempted)} />
          <MiniStat label="Correct" value={String(data.totalCorrect)} />
          <MiniStat label="Incorrect" value={String(data.totalIncorrect)} />
          <MiniStat label="Unanswered" value={String(data.totalUnanswered)} />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Surface elevated className="space-y-3 p-4">
          <h3 className="text-sm font-semibold text-[var(--ink)]">Correct vs incorrect</h3>
          <AccuracyDonut
            correct={data.correctWrongRatio.correct}
            incorrect={data.correctWrongRatio.incorrect}
          />
        </Surface>

        <Surface elevated className="space-y-3 p-4">
          <h3 className="text-sm font-semibold text-[var(--ink)]">Score trend</h3>
          <BarChart
            data={trendBars}
            formatValue={(v) => `${v}%`}
            emptyLabel="Complete an exam to see trends."
          />
        </Surface>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Surface elevated className="space-y-3 p-4">
          <h3 className="text-sm font-semibold text-[var(--ink)]">Subject-wise average</h3>
          <BarChart
            data={subjectBars}
            formatValue={(v) => `${v}%`}
            emptyLabel="Assign a category on practice sets to unlock subject analytics."
          />
        </Surface>

        <Surface elevated className="space-y-3 p-4">
          <h3 className="text-sm font-semibold text-[var(--ink)]">Strengths &amp; weaknesses</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold tracking-wide text-[var(--success)] uppercase">
                Strong
              </p>
              {data.strongSubjects.length === 0 ? (
                <p className="text-sm text-[var(--muted-strong)]">—</p>
              ) : (
                <ul className="space-y-1">
                  {data.strongSubjects.map((s) => (
                    <li key={s.categoryId} className="text-sm">
                      {s.name}{' '}
                      <span className="tabular-nums text-[var(--muted-strong)]">
                        {s.averagePercent}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold tracking-wide text-[var(--danger)] uppercase">
                Weak
              </p>
              {data.weakSubjects.length === 0 ? (
                <p className="text-sm text-[var(--muted-strong)]">—</p>
              ) : (
                <ul className="space-y-1">
                  {data.weakSubjects.map((s) => (
                    <li key={s.categoryId} className="text-sm">
                      {s.name}{' '}
                      <span className="tabular-nums text-[var(--muted-strong)]">
                        {s.averagePercent}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Surface>
      </div>

      <Surface elevated className="space-y-3 p-4">
        <h3 className="text-sm font-semibold text-[var(--ink)]">Recent exams</h3>
        {data.recentExams.length === 0 ? (
          <p className="text-sm text-[var(--muted-strong)]">
            No exams yet.{' '}
            <Link href="/quizzes" className="font-semibold text-[var(--highlight)]">
              Open quiz center
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {data.recentExams.map((exam) => (
              <li key={exam.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <Link
                    href={`/results/${exam.id}`}
                    className="font-medium text-[var(--ink)] hover:text-[var(--highlight)]"
                  >
                    {exam.title}
                  </Link>
                  <p className="text-xs text-[var(--muted-strong)]">
                    {practiceKindLabel(exam.kind)}
                    {exam.submittedAt
                      ? ` · ${new Date(exam.submittedAt).toLocaleString()}`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{exam.status}</Badge>
                  <span className="font-display text-base font-bold tabular-nums">
                    {exam.percentScore != null ? `${exam.percentScore}%` : '—'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </div>
  );
}
