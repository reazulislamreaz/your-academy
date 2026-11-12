import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'navy' | 'red' | 'blue' | 'teal' | 'amber' | 'slate' | 'purple';

const tones: Record<Tone, { icon: string; wash: string }> = {
  navy: { icon: 'bg-[var(--bg-inverse)] text-[var(--bg)]', wash: 'bg-[var(--brand-wash)]' },
  red: { icon: 'bg-[var(--danger)] text-white', wash: 'bg-[var(--danger-soft)]' },
  blue: { icon: 'bg-[var(--viz-neutral)] text-white', wash: 'bg-[var(--info-soft)]' },
  teal: { icon: 'bg-[var(--viz-positive)] text-[#06281c]', wash: 'bg-[var(--success-soft)]' },
  amber: { icon: 'bg-[var(--viz-achievement)] text-[#1a1405]', wash: 'bg-[var(--bookmark-soft)]' },
  slate: { icon: 'bg-[var(--muted)] text-white', wash: 'bg-[var(--bg-muted)]' },
  purple: { icon: 'bg-[var(--viz-insight)] text-white', wash: 'bg-[var(--insight-soft)]' },
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
        'motion-hover-lift relative min-w-0 max-w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)] sm:p-5',
        className,
      )}
    >
      <div className={cn('absolute -right-6 -bottom-6 h-24 w-24 rounded-full opacity-60', t.wash)} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold tracking-[0.12em] text-[var(--muted-strong)] uppercase">
            {label}
          </p>
          <p className="mt-2 font-display text-2xl leading-none font-bold tracking-tight tabular-nums text-[var(--ink)] sm:text-3xl">
            {value}
          </p>
          {hint ? (
            <p className="mt-2 truncate text-sm leading-snug text-[var(--muted-strong)]">{hint}</p>
          ) : null}
        </div>
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-xl sm:size-10',
            t.icon,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </div>
  );
}
