'use client';

import { cn } from '@/lib/utils';

type Props = {
  total: number;
  answered: number;
  unanswered: number;
  marked: number;
  className?: string;
};

export function ExamProgressCard({
  total,
  answered,
  unanswered,
  marked,
  className,
}: Props) {
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div
      className={cn(
        'space-y-3 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)]',
        className,
      )}
    >
      <div className="flex items-end justify-between gap-2">
        <h3 className="font-display text-sm font-semibold tracking-tight text-[var(--ink)]">
          Progress
        </h3>
        <p className="font-display text-lg font-bold tabular-nums text-[var(--ink)]">{pct}%</p>
      </div>

      <div
        className="h-2.5 overflow-hidden rounded-full bg-[var(--bg-muted)]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Answered progress"
      >
        <div
          className="h-full rounded-full bg-[var(--success)] transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-[var(--radius-sm)] bg-[var(--bg-muted)]/50 px-2.5 py-2">
          <dt className="text-[0.65rem] text-[var(--muted)]">Answered</dt>
          <dd className="font-semibold tabular-nums text-[var(--success-fg)]">
            {answered}/{total}
          </dd>
        </div>
        <div className="rounded-[var(--radius-sm)] bg-[var(--bg-muted)]/50 px-2.5 py-2">
          <dt className="text-[0.65rem] text-[var(--muted)]">Unanswered</dt>
          <dd className="font-semibold tabular-nums text-[var(--ink)]">{unanswered}</dd>
        </div>
        <div className="rounded-[var(--radius-sm)] bg-[var(--bg-muted)]/50 px-2.5 py-2">
          <dt className="text-[0.65rem] text-[var(--muted)]">Marked</dt>
          <dd className="font-semibold tabular-nums text-[var(--warning-fg)]">{marked}</dd>
        </div>
        <div className="rounded-[var(--radius-sm)] bg-[var(--bg-muted)]/50 px-2.5 py-2">
          <dt className="text-[0.65rem] text-[var(--muted)]">Remaining</dt>
          <dd className="font-semibold tabular-nums text-[var(--ink)]">{unanswered}</dd>
        </div>
      </dl>
    </div>
  );
}
