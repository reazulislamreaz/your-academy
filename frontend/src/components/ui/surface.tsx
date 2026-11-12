import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  /** Dense admin / table panels */
  density?: 'default' | 'compact';
  /** Remove shadow for nested or quiet panels */
  quiet?: boolean;
  /** Gentle lift on hover — for clickable / browse cards only */
  interactive?: boolean;
  /** Soft desk panel with slightly stronger elevation */
  elevated?: boolean;
};

/**
 * Interaction/content surface — use when a bordered panel aids scanning or forms.
 * Prefer open layouts on marketing heroes (no surface).
 */
export function Surface({
  className,
  density = 'default',
  quiet,
  interactive,
  elevated,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={cn(
        'min-w-0 max-w-full rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)]',
        quiet ? 'border-[var(--line)]/80 shadow-none' : elevated ? 'shadow-[var(--shadow)]' : 'shadow-[var(--shadow-sm)]',
        density === 'compact' && 'rounded-[var(--radius)]',
        interactive && 'motion-hover-lift',
        className,
      )}
      {...props}
    />
  );
}
