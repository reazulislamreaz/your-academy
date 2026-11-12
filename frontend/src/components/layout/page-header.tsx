import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  eyebrow?: string;
};

export function PageHeader({ title, description, actions, className, eyebrow }: Props) {
  return (
    <div
      className={cn(
        'page-header-mobile-tight flex flex-col gap-3 border-b border-[var(--line)]/70 pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:pb-6',
        className,
      )}
    >
      <div className="min-w-0 space-y-1.5 sm:space-y-2">
        {eyebrow ? (
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-[3px] w-6 shrink-0 rounded-full bg-[linear-gradient(90deg,var(--highlight),var(--accent))]"
              aria-hidden
            />
            <p className="text-[0.6875rem] font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">
              {eyebrow}
            </p>
          </div>
        ) : null}
        <h1 className="break-words font-display text-[clamp(1.5rem,5.5vw,2.35rem)] font-bold tracking-[-0.02em] text-[var(--ink)]">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted-strong)] sm:text-[0.9375rem]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 [&_a]:min-h-10 [&_button]:min-h-10">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
