import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
};

/** Stack of mobile-only list cards (hidden from md+). */
export function AdminMobileCards({ children, className }: Props) {
  return <div className={cn('space-y-3 md:hidden', className)}>{children}</div>;
}

type CardProps = {
  selected?: boolean;
  onToggleSelect?: () => void;
  selectLabel?: string;
  title: ReactNode;
  meta?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/** Single admin entity card for phones — replaces wide table rows. */
export function AdminMobileCard({
  selected,
  onToggleSelect,
  selectLabel,
  title,
  meta,
  badges,
  actions,
  className,
}: CardProps) {
  return (
    <article
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-3.5 shadow-[var(--shadow-sm)]',
        selected && 'border-[var(--accent)]/40 ring-1 ring-[var(--accent)]/25',
        className,
      )}
    >
      <div className="flex gap-3">
        {onToggleSelect ? (
          <label className="flex shrink-0 items-start pt-1">
            <span className="sr-only">{selectLabel ?? 'Select row'}</span>
            <input
              type="checkbox"
              className="admin-checkbox mt-0.5"
              checked={Boolean(selected)}
              onChange={onToggleSelect}
            />
          </label>
        ) : null}
        <div className="min-w-0 flex-1 space-y-2">
          {badges ? <div className="flex flex-wrap gap-1.5">{badges}</div> : null}
          <div className="font-display text-[0.95rem] font-semibold leading-snug text-[var(--ink)]">
            {title}
          </div>
          {meta ? <div className="text-xs leading-relaxed text-[var(--muted-strong)]">{meta}</div> : null}
          {actions ? (
            <div className="flex flex-wrap gap-2 pt-1 [&_button]:min-h-10 [&_a]:inline-flex">{actions}</div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
