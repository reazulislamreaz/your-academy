import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type LearnerPageProps = {
  children: ReactNode;
  className?: string;
  /** Tighter vertical rhythm for dense lists / filters */
  dense?: boolean;
};

/** Consistent content rhythm for every learner `(app)` route. */
export function LearnerPage({ children, className, dense }: LearnerPageProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full min-w-0',
        dense ? 'space-y-5 sm:space-y-6' : 'space-y-6 sm:space-y-8',
        className,
      )}
    >
      {children}
    </div>
  );
}

type LearnerSectionProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function LearnerSection({
  title,
  description,
  actions,
  children,
  className,
}: LearnerSectionProps) {
  return (
    <section className={cn('min-w-0 space-y-3 sm:space-y-4', className)}>
      {title || actions ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-3">
          <div className="min-w-0">
            {title ? (
              <h2 className="font-display text-base font-semibold tracking-tight break-words text-[var(--ink)] sm:text-[1.0625rem]">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 max-w-2xl text-pretty break-words text-sm leading-relaxed text-[var(--muted)]">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
