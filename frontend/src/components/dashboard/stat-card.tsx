import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'navy' | 'red' | 'blue' | 'teal' | 'amber' | 'violet' | 'slate';

const tones: Record<Tone, { icon: string; wash: string }> = {
  navy: { icon: 'bg-[var(--bg-inverse)] text-white', wash: 'bg-[var(--brand-wash)]' },
  red: { icon: 'bg-[var(--highlight)] text-white', wash: 'bg-[var(--highlight-soft)]' },
  blue: { icon: 'bg-[var(--info)] text-white', wash: 'bg-[var(--info-soft)]' },
  teal: { icon: 'bg-[var(--success)] text-white', wash: 'bg-[var(--success-soft)]' },
  amber: { icon: 'bg-[var(--warning)] text-white', wash: 'bg-[#fff4e5]' },
  violet: { icon: 'bg-[#7c3aed] text-white', wash: 'bg-[#f3e8ff]' },
  slate: { icon: 'bg-[var(--muted-strong)] text-white', wash: 'bg-[var(--bg-muted)]' },
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
        'relative overflow-hidden rounded-[16px] border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-sm)]',
        className,
      )}
    >
      <div className={cn('absolute -right-6 -bottom-6 h-24 w-24 rounded-full opacity-60', t.wash)} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
            {label}
          </p>
          <p className="mt-2 font-display text-3xl leading-none font-bold tracking-tight tabular-nums text-[var(--ink)]">
            {value}
          </p>
          {hint ? <p className="mt-2 text-xs leading-snug text-[var(--muted)]">{hint}</p> : null}
        </div>
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', t.icon)}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </div>
  );
}
