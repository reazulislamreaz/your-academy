import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'blue' | 'green' | 'teal' | 'amber' | 'red' | 'navy' | 'purple';

const tones: Record<Tone, { bg: string; icon: string }> = {
  blue: { bg: 'bg-[var(--info-soft)]', icon: 'text-[var(--viz-neutral)]' },
  green: { bg: 'bg-[var(--success-soft)]', icon: 'text-[var(--viz-positive)]' },
  teal: { bg: 'bg-[var(--success-soft)]', icon: 'text-[var(--viz-positive)]' },
  amber: { bg: 'bg-[var(--bookmark-soft)]', icon: 'text-[var(--viz-achievement)]' },
  red: { bg: 'bg-[var(--danger-soft)]', icon: 'text-[var(--viz-negative)]' },
  navy: { bg: 'bg-[var(--brand-wash-strong)]', icon: 'text-[var(--ink-soft)]' },
  purple: { bg: 'bg-[var(--insight-soft)]', icon: 'text-[var(--viz-insight)]' },
};

type Props = {
  label: string;
  value: string | number;
  suffix?: string;
  icon: LucideIcon;
  tone?: Tone;
  className?: string;
};

/** Compact metric tile aligned with learner home KPI language. */
export function MetricTile({ label, value, suffix, icon: Icon, tone = 'navy', className }: Props) {
  const t = tones[tone];
  return (
    <div
      className={cn(
        'motion-hover-lift ya-panel-shine relative flex min-w-0 items-start gap-2.5 overflow-x-clip rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-sm)] sm:items-center sm:gap-3 sm:p-4',
        className,
      )}
    >
      <div
        className={cn(
          'relative z-[1] mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)] sm:mt-0 sm:size-11',
          t.bg,
        )}
      >
        <Icon className={cn('size-4 sm:size-5', t.icon)} aria-hidden strokeWidth={1.75} />
      </div>
      <div className="relative z-[1] min-w-0 flex-1">
        <p className="font-display text-lg font-bold tabular-nums leading-tight text-[var(--ink)] sm:text-2xl">
          {value}
          {suffix ? (
            <span className="text-sm font-semibold text-[var(--muted)]">{suffix}</span>
          ) : null}
        </p>
        <p className="mt-0.5 text-[0.7rem] leading-snug font-medium text-pretty hyphens-auto break-words text-[var(--muted)] sm:text-sm">
          {label}
        </p>
      </div>
    </div>
  );
}
