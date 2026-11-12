import { cn } from '@/lib/utils';

type Props = {
  /** 0–100 for determinate; omit / null for indeterminate wash */
  value?: number | null;
  className?: string;
  trackClassName?: string;
  barClassName?: string;
  label?: string;
  size?: 'sm' | 'md';
};

/** File upload / bulk import progress — determinate or soft indeterminate. */
export function ProgressBar({
  value,
  className,
  trackClassName,
  barClassName,
  label = 'Progress',
  size = 'sm',
}: Props) {
  const determinate = typeof value === 'number' && Number.isFinite(value);
  const pct = determinate ? Math.min(100, Math.max(0, value)) : null;

  return (
    <div
      className={cn('w-full', className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct ?? undefined}
      aria-valuetext={pct == null ? 'In progress' : `${Math.round(pct)}%`}
    >
      <div
        className={cn(
          'overflow-hidden rounded-full bg-[var(--bg-muted)]',
          size === 'sm' ? 'h-1.5' : 'h-2.5',
          trackClassName,
        )}
      >
        {determinate ? (
          <div
            className={cn(
              'h-full rounded-full bg-[var(--highlight)] transition-[width] duration-[var(--duration)] ease-[var(--ease-out)]',
              barClassName,
            )}
            style={{ width: `${pct}%` }}
          />
        ) : (
          <div className={cn('ya-progress-indeterminate h-full w-1/3 rounded-full bg-[var(--highlight)]', barClassName)} />
        )}
      </div>
    </div>
  );
}
