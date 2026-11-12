import type { ReactNode } from 'react';
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
    <div className={cn(dense ? 'space-y-5' : 'space-y-7 sm:space-y-8', className)}>{children}</div>
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
    <section className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold tracking-tight text-[var(--ink)]">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-[var(--muted-strong)]">{description}</p>
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
