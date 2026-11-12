import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** Default start-aligned; use center for full-page empty moments. */
  align?: 'start' | 'center';
};

export function EmptyState({ title, description, action, className, align = 'start' }: Props) {
  return (
    <div
      className={cn(
        'motion-fade-in flex flex-col gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--line-strong)] bg-[var(--bg-elevated)] px-6 py-10',
        align === 'center' ? 'items-center text-center' : 'items-start text-left',
        className,
      )}
    >
      <h3 className="font-display text-lg font-semibold text-[var(--ink)]">{title}</h3>
      {description ? (
        <p className="max-w-md text-sm leading-relaxed text-[var(--muted-strong)]">{description}</p>
      ) : null}
      {action ? (
        <div className={cn('flex flex-wrap gap-2', align === 'center' && 'justify-center')}>
          {action}
        </div>
      ) : null}
    </div>
  );
}
