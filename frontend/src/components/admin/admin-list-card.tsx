import type { ReactNode } from 'react';
import { Surface } from '@/components/ui/surface';
import { cn } from '@/lib/utils';

type Props = {
  title: ReactNode;
  meta?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/**
 * Responsive list row for admin content (practice sets, news, documents).
 * Stacks on mobile; title + actions on one line on desktop.
 */
export function AdminListCard({ title, meta, badges, actions, children, className }: Props) {
  return (
    <Surface
      interactive
      className={cn(
        'admin-list-card flex flex-col gap-3 p-4 transition-[border-color,box-shadow] duration-150 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5',
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        {badges ? <div className="flex flex-wrap items-center gap-1.5">{badges}</div> : null}
        <div className="font-display text-base font-semibold tracking-tight text-[var(--ink)]">
          {title}
        </div>
        {meta ? <div className="text-xs leading-relaxed text-[var(--muted-strong)]">{meta}</div> : null}
        {children}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">{actions}</div>
      ) : null}
    </Surface>
  );
}
