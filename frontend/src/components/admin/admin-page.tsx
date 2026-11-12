import type { ReactNode } from 'react';
import { Surface } from '@/components/ui/surface';
import { cn } from '@/lib/utils';

type AdminPageProps = {
  children: ReactNode;
  className?: string;
  /** Tighter vertical rhythm for dense tables */
  dense?: boolean;
};

/** Consistent content column rhythm for every admin route. */
export function AdminPage({ children, className, dense }: AdminPageProps) {
  return (
    <div className={cn(dense ? 'space-y-5' : 'space-y-6 sm:space-y-8', className)}>{children}</div>
  );
}

type AdminSectionProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function AdminSection({
  title,
  description,
  actions,
  children,
  className,
}: AdminSectionProps) {
  return (
    <section className={cn('space-y-3 sm:space-y-4', className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold tracking-tight text-[var(--ink)]">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--muted-strong)]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

type AdminToolbarProps = {
  children: ReactNode;
  className?: string;
};

/** Filter / search strip above tables and lists. */
export function AdminToolbar({ children, className }: AdminToolbarProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-sm)] sm:p-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

type AdminFormPanelProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
};

/** Create / edit panel with clear hierarchy for non-technical admins. */
export function AdminFormPanel({
  title,
  description,
  children,
  className,
  footer,
}: AdminFormPanelProps) {
  return (
    <Surface className={cn('overflow-hidden p-0', className)}>
      <div className="border-b border-[var(--line)] px-4 py-3.5 sm:px-5">
        <h2 className="font-display text-base font-bold tracking-tight text-[var(--ink)] sm:text-lg">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-[var(--muted-strong)]">{description}</p>
        ) : null}
      </div>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
      {footer ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] bg-[var(--bg-desk)]/60 px-4 py-3 sm:px-5">
          {footer}
        </div>
      ) : null}
    </Surface>
  );
}

type AdminBulkBarProps = {
  count: number;
  children: ReactNode;
  className?: string;
  label?: string;
};

/** Sticky selection bar for bulk table actions. */
export function AdminBulkBar({ count, children, className, label = 'selected' }: AdminBulkBarProps) {
  if (count < 1) return null;
  return (
    <div
      className={cn(
        'sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--accent)]/25 bg-[var(--bg-elevated)] px-4 py-3 shadow-[var(--shadow)]',
        className,
      )}
      role="status"
    >
      <p className="text-sm text-[var(--ink-soft)]">
        <span className="font-semibold tabular-nums text-[var(--ink)]">{count}</span> {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

type AdminListMetaProps = {
  count: number;
  noun: string;
  hasMore?: boolean;
  query?: string;
  className?: string;
};

export function AdminListMeta({ count, noun, hasMore, query, className }: AdminListMetaProps) {
  const plural = count === 1 ? noun : `${noun}s`;
  return (
    <p className={cn('text-sm text-[var(--muted-strong)]', className)}>
      Showing <span className="font-semibold tabular-nums text-[var(--ink-soft)]">{count}</span>
      {hasMore ? '+' : ''} {plural}
      {query ? (
        <>
          {' '}
          for <span className="font-medium text-[var(--ink)]">“{query}”</span>
        </>
      ) : null}
    </p>
  );
}

type AdminStatGridProps = {
  children: ReactNode;
  className?: string;
};

export function AdminStatGrid({ children, className }: AdminStatGridProps) {
  return (
    <div className={cn('motion-stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-4', className)}>
      {children}
    </div>
  );
}
