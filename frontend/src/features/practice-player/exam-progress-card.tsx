'use client';

import { Surface } from '@/components/ui/surface';

type Props = {
  total: number;
  answered: number;
  unanswered: number;
  marked: number;
};

export function ExamProgressCard({ total, answered, unanswered, marked }: Props) {
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <Surface elevated className="space-y-3 p-4">
      <h3 className="font-display text-sm font-semibold tracking-tight text-[var(--ink)]">
        Progress Overview
      </h3>
      <dl className="space-y-1.5 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--muted-strong)]">Answered</dt>
          <dd className="font-semibold tabular-nums text-[var(--ink)]">
            {answered}/{total}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--muted-strong)]">Marked for Review</dt>
          <dd className="font-semibold tabular-nums text-[var(--ink)]">{marked}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--muted-strong)]">Remaining</dt>
          <dd className="font-semibold tabular-nums text-[var(--ink)]">{unanswered}</dd>
        </div>
      </dl>
      <div
        className="h-2 overflow-hidden rounded-full bg-[var(--bg-muted)]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Answered progress"
      >
        <div
          className="h-full rounded-full bg-[var(--highlight)] transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </Surface>
  );
}
