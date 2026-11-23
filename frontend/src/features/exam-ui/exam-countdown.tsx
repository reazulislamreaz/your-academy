'use client';

import { Clock3 } from 'lucide-react';
import { memo } from 'react';
import { cn } from '@/lib/utils';
import { formatClock, timerTone } from './format';

type Props = {
  remainingSeconds: number;
  /** Full allowance — drives the 10% warning threshold. */
  totalSeconds: number | null;
  className?: string;
};

const TONE_LABEL = {
  normal: null,
  warning: 'Time is running low.',
  danger: 'Less than a minute left. The exam submits automatically at zero.',
} as const;

/**
 * Presentational countdown. Parents should keep the ticking state inside a small
 * wrapper so the question list does not re-render every second.
 */
export const ExamCountdown = memo(function ExamCountdown({
  remainingSeconds,
  totalSeconds,
  className,
}: Props) {
  const tone = timerTone(remainingSeconds, totalSeconds);
  const display = formatClock(remainingSeconds);
  const announcement = TONE_LABEL[tone];

  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius)] border px-2.5 py-1.5 font-semibold tabular-nums transition-colors sm:gap-2 sm:px-3',
        tone === 'normal' && 'border-[var(--line)] bg-[var(--bg-muted)] text-[var(--ink)]',
        tone === 'warning' &&
          'border-[var(--warning)]/50 bg-[var(--warning-soft)] text-[var(--warning-fg)]',
        tone === 'danger' &&
          'border-[var(--danger)]/60 bg-[var(--danger-soft)] text-[var(--danger-fg)]',
        className,
      )}
    >
      <Clock3
        className={cn('size-4 shrink-0', tone === 'danger' && 'motion-safe:animate-pulse')}
        aria-hidden
      />
      {/* role=timer is implicitly aria-live="off" — we announce thresholds separately. */}
      <span role="timer" aria-label={`Time remaining ${display}`} className="text-base sm:text-lg">
        {display}
      </span>
      <span className="sr-only" aria-live="assertive">
        {announcement}
      </span>
    </div>
  );
});
