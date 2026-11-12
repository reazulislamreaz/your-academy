import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'navy' | 'red' | 'blue' | 'teal' | 'amber' | 'slate' | 'purple';

const tones: Record<Tone, { icon: string; wash: string; ring: string }> = {
  navy: {
    icon: 'bg-[var(--bg-inverse)] text-[var(--bg)]',
    wash: 'bg-[var(--brand-wash)]',
    ring: 'ring-[var(--line)]',
  },
  red: {
    icon: 'bg-[var(--danger)] text-white',
    wash: 'bg-[var(--danger-soft)]',
    ring: 'ring-[var(--danger)]/15',
  },
  blue: {
    icon: 'bg-[var(--viz-neutral)] text-white',
    wash: 'bg-[var(--info-soft)]',
    ring: 'ring-[var(--info)]/15',
  },
  teal: {
    icon: 'bg-[var(--viz-positive)] text-[#06281c]',
    wash: 'bg-[var(--success-soft)]',
    ring: 'ring-[var(--success)]/15',
  },
  amber: {
    icon: 'bg-[var(--viz-achievement)] text-[#1a1405]',
    wash: 'bg-[var(--bookmark-soft)]',
    ring: 'ring-[var(--bookmark)]/15',
  },
  slate: {
    icon: 'bg-[var(--muted)] text-white',
    wash: 'bg-[var(--bg-muted)]',
    ring: 'ring-[var(--line)]',
  },
  purple: {
    icon: 'bg-[var(--viz-insight)] text-white',
    wash: 'bg-[var(--insight-soft)]',
    ring: 'ring-[var(--insight)]/15',
  },
};

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
  className?: string;
};

export function StatCard({ label, value, hint, icon: Icon, tone = 'navy', className }: Props) {
  const t = tones[tone];
  return (
    <div
      className={cn(
        'motion-hover-lift ya-panel-shine relative min-w-0 max-w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)] ring-1 ring-transparent sm:p-5',
        t.ring,
        className,
      )}
    >
      <div className={cn('absolute -right-8 -bottom-8 h-28 w-28 rounded-full opacity-70 blur-[1px]', t.wash)} />
      <div className="relative z-[1] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[0.6875rem] font-semibold tracking-[0.14em] text-[var(--muted-strong)] uppercase">
            {label}
          </p>
          <p className="mt-2.5 font-display text-2xl leading-none font-bold tracking-tight tabular-nums text-[var(--ink)] sm:text-[1.85rem]">
            {value}
          </p>
          {hint ? (
            <p className="mt-2.5 truncate text-sm leading-snug text-[var(--muted-strong)]">{hint}</p>
          ) : null}
        </div>
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-2xl shadow-[var(--shadow-sm)] sm:size-11',
            t.icon,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden strokeWidth={1.75} />
        </span>
      </div>
    </div>
  );
}
