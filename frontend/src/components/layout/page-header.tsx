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
        'flex flex-col gap-4 border-b border-[var(--line)]/80 pb-6 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        {eyebrow ? (
          <p className="flex items-center gap-2.5 text-[0.6875rem] font-semibold tracking-[0.16em] text-[var(--highlight)] uppercase">
            <span
              aria-hidden
              className="inline-block h-1 w-6 shrink-0 rounded-full bg-[var(--highlight)]"
            />
            {eyebrow}
          </p>
        ) : null}
        <h1 className="break-words font-display text-[clamp(1.625rem,4vw,2.125rem)] font-bold tracking-tight text-[var(--ink)]">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted-strong)] sm:text-[0.9375rem]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
