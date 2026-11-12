import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  icon: LucideIcon;
  value: string | number;
  label: string;
  subtitle?: string;
  footer?: ReactNode;
  className?: string;
  /** Extra classes for the icon (e.g. brand red target). */
  iconClassName?: string;
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
}: Props) {
  return (
    <div
      className={cn(
        'motion-hover-lift flex min-h-[220px] flex-col rounded-[var(--radius-xl)] border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)] sm:p-6',
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--ink)]">
        <Icon className={cn('size-6', iconClassName)} aria-hidden strokeWidth={1.75} />
      </span>
      <p className="mt-5 font-display text-3xl font-bold tracking-tight tabular-nums text-[var(--ink)] sm:text-4xl">
        {value}
      </p>
      <p className="mt-1.5 text-sm font-semibold text-[var(--ink)] sm:text-base">{label}</p>
      {subtitle ? (
        <p className="mt-0.5 text-xs leading-snug text-[var(--muted-strong)]">{subtitle}</p>
      ) : null}
      {footer ? <div className="mt-auto pt-5">{footer}</div> : null}
    </div>
  );
}
