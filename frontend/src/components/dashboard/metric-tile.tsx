import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'blue' | 'green' | 'teal' | 'amber' | 'red' | 'navy';

const tones: Record<Tone, { bg: string; icon: string }> = {
  blue: { bg: 'bg-[var(--info-soft)]', icon: 'text-[var(--info)]' },
  green: { bg: 'bg-[var(--success-soft)]', icon: 'text-[var(--success)]' },
  teal: { bg: 'bg-[var(--success-soft)]', icon: 'text-[var(--success)]' },
  amber: { bg: 'bg-[#fff4e5]', icon: 'text-[var(--warning)]' },
  red: { bg: 'bg-[var(--highlight-soft)]', icon: 'text-[var(--highlight)]' },
  navy: { bg: 'bg-[var(--brand-wash-strong)]', icon: 'text-[var(--ink)]' },
};

type Props = {
  label: string;
  value: string | number;
  suffix?: string;
  icon: LucideIcon;
  tone?: Tone;
  className?: string;
};

/** Compact QBook-style metric tile (icon chip + value + label). */
export function MetricTile({ label, value, suffix, icon: Icon, tone = 'blue', className }: Props) {
  const t = tones[tone];
  return (
    <div
      className={cn(
        'motion-hover-lift flex min-w-0 items-center gap-2.5 rounded-[14px] border border-[var(--line)] bg-white p-3 shadow-[var(--shadow-sm)] sm:gap-3 sm:p-4',
        className,
      )}
    >
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg sm:size-10',
          t.bg,
        )}
      >
        <Icon className={cn('size-4 sm:size-5', t.icon)} aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold tabular-nums text-[var(--ink)] sm:text-2xl">
          {value}
          {suffix ? (
            <span className="text-sm font-normal text-[var(--muted-strong)]">{suffix}</span>
          ) : null}
        </p>
        <p className="truncate text-xs font-medium text-[var(--muted-strong)] sm:text-sm">{label}</p>
      </div>
    </div>
  );
}
