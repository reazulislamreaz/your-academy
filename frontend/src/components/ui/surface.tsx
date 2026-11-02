import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Interaction/content surface — use when a bordered panel aids scanning or forms.
 * Prefer open layouts on marketing heroes (no surface).
 */
export function Surface({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow-sm)]',
        className,
      )}
      {...props}
    />
  );
}
