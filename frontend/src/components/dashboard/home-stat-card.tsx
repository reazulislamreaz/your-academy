import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type HomeStatTone = 'neutral' | 'positive' | 'insight' | 'achievement' | 'brand';

const toneStyles: Record<
  HomeStatTone,
  { wash: string; iconBg: string; icon: string; accent: string }
> = {
  neutral: {
    wash: 'bg-[var(--info-soft)]',
    iconBg: 'bg-[var(--info-soft)]',
    icon: 'text-[var(--viz-neutral)]',
    accent: 'var(--viz-neutral)',
  },
  positive: {
    wash: 'bg-[var(--success-soft)]',
    iconBg: 'bg-[var(--success-soft)]',
    icon: 'text-[var(--viz-positive)]',
    accent: 'var(--viz-positive)',
  },
  insight: {
    wash: 'bg-[var(--insight-soft)]',
    iconBg: 'bg-[var(--insight-soft)]',
    icon: 'text-[var(--viz-insight)]',
    accent: 'var(--viz-insight)',
  },
  achievement: {
    wash: 'bg-[var(--bookmark-soft)]',
    iconBg: 'bg-[var(--bookmark-soft)]',
    icon: 'text-[var(--viz-achievement)]',
    accent: 'var(--viz-achievement)',
  },
  brand: {
    wash: 'bg-[var(--highlight-soft)]',
    iconBg: 'bg-[var(--highlight-soft)]',
    icon: 'text-[var(--highlight)]',
    accent: 'var(--highlight)',
  },
};

type Props = {
  icon: LucideIcon;
  value: string | number;
  label: string;
  subtitle?: string;
  footer?: ReactNode;
  className?: string;
  /** Extra classes for the icon. */
  iconClassName?: string;
  /** Semantic KPI tone — guides icon wash + accent bar. */
  tone?: HomeStatTone;
};

/** Large home KPI card — icon, primary stat, label, optional footer (trend / ring). */
export function HomeStatCard({
  icon: Icon,
  value,
  label,
  subtitle,
  footer,
  className,
  iconClassName,
  tone = 'neutral',
}: Props) {
  const t = toneStyles[tone];
  return (
    <div
      className={cn(
        'motion-hover-lift ya-panel-shine group relative flex min-h-[210px] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow)] sm:p-6',
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute top-0 left-0 h-full w-[3px] rounded-l-[var(--radius-xl)]"
        style={{ background: t.accent }}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -top-10 -right-8 size-28 rounded-full opacity-70 transition-transform duration-[var(--duration-slow)] group-hover:scale-110',
          t.wash,
        )}
      />
      <span
        className={cn(
          'relative flex size-11 items-center justify-center rounded-[var(--radius)] sm:size-12',
          t.iconBg,
          t.icon,
        )}
      >
        <Icon className={cn('size-5 sm:size-6', iconClassName)} aria-hidden strokeWidth={1.75} />
      </span>
      <p className="relative mt-5 font-display text-3xl font-bold tracking-tight tabular-nums text-[var(--ink)] sm:text-[2.125rem]">
        {value}
      </p>
      <p className="relative mt-1.5 text-sm font-semibold text-[var(--ink)] sm:text-[0.9375rem]">{label}</p>
      {subtitle ? (
        <p className="relative mt-0.5 text-xs leading-snug text-[var(--muted)]">{subtitle}</p>
      ) : null}
      {footer ? <div className="relative mt-auto pt-5">{footer}</div> : null}
    </div>
  );
}
