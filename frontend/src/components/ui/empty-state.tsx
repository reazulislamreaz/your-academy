import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--line-strong)] bg-[var(--bg-elevated)] px-6 py-10',
        className,
      )}
    >
      <h3 className="font-display text-lg font-semibold text-[var(--ink)]">{title}</h3>
      {description ? <p className="max-w-md text-sm text-[var(--muted)]">{description}</p> : null}
      {action}
    </div>
  );
}
