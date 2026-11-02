import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  /** Dense admin / table panels */
  density?: 'default' | 'compact';
  /** Remove shadow for nested or quiet panels */
  quiet?: boolean;
};

/**
 * Interaction/content surface — use when a bordered panel aids scanning or forms.
 * Prefer open layouts on marketing heroes (no surface).
 */
export function Surface({ className, density = 'default', quiet, ...props }: SurfaceProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)]',
        quiet ? '' : 'shadow-[var(--shadow-sm)]',
        density === 'compact' && 'rounded-[var(--radius)]',
        className,
      )}
      {...props}
    />
  );
}
