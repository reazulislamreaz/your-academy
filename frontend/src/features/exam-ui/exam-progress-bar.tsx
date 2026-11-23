import { memo } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  answered: number;
  total: number;
  marked?: number;
  className?: string;
};

/** "12/50 answered" with a slim bar — sits inside the sticky exam header. */
export const ExamProgressBar = memo(function ExamProgressBar({
  answered,
  total,
  marked = 0,
  className,
}: Props) {
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div className={cn('min-w-0 space-y-1', className)}>
      <div className="flex items-center justify-between gap-2 text-xs text-[var(--muted-strong)]">
        <span className="tabular-nums">
          <span className="font-semibold text-[var(--ink)]">{answered}</span>/{total} answered
        </span>
        {marked > 0 ? (
          <span className="tabular-nums text-[var(--warning-fg)]">{marked} marked</span>
        ) : null}
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-muted)]"
        role="progressbar"
        aria-valuenow={answered}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuetext={`${answered} of ${total} answered`}
        aria-label="Answered questions"
      >
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
});
