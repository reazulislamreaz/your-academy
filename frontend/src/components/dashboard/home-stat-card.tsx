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
        'motion-hover-lift group relative flex min-h-[210px] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)] sm:p-6',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-8 size-28 rounded-full bg-[var(--brand-wash)] opacity-80 transition-transform duration-[var(--duration-slow)] group-hover:scale-110"
      />
      <span className="relative flex size-11 items-center justify-center rounded-[14px] bg-[var(--brand-wash-strong)] text-[var(--ink)] sm:size-12">
        <Icon className={cn('size-5 sm:size-6', iconClassName)} aria-hidden strokeWidth={1.75} />
      </span>
      <p className="relative mt-5 font-display text-3xl font-bold tracking-tight tabular-nums text-[var(--ink)] sm:text-[2.125rem]">
        {value}
      </p>
      <p className="relative mt-1.5 text-sm font-semibold text-[var(--ink)] sm:text-[0.9375rem]">{label}</p>
      {subtitle ? (
        <p className="relative mt-0.5 text-xs leading-snug text-[var(--muted-strong)]">{subtitle}</p>
      ) : null}
      {footer ? <div className="relative mt-auto pt-5">{footer}</div> : null}
    </div>
  );
}
