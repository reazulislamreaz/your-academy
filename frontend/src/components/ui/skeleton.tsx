'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { Delayed } from '@/components/loading/delayed';
import { cn } from '@/lib/utils';

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  /** Soft shimmer tuned for navy/inverse panels */
  inverse?: boolean;
};

/** Primitive shimmer block — prefer content-matching skeletons from `@/components/skeletons`. */
export function Skeleton({ className, inverse, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton', inverse && 'skeleton-on-inverse', className)}
      aria-hidden
      {...props}
    />
  );
}

/** Soft fade when real content replaces a skeleton block. */
export function ContentIn({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('skeleton-swap motion-content-in', className)}>{children}</div>;
}

type SkeletonRegionProps = {
  loading: boolean;
  /** Visible to screen readers while busy */
  label?: string;
  /** Content-matching skeleton layout */
  fallback: ReactNode;
  children: ReactNode;
  className?: string;
  /**
   * Optional delay before painting the skeleton (ms). Default `0` reserves layout
   * immediately (preferred). Use a small delay only for overlay-style waits.
   */
  delayMs?: number;
};

/**
 * Component-level loading gate: keeps layout reserved, announces busy state,
 * and fades content in when ready. Use `isLoading` (no cached data), not `isFetching`.
 */
export function SkeletonRegion({
  loading,
  label = 'Loading',
  fallback,
  children,
  className,
  delayMs = 0,
}: SkeletonRegionProps) {
  if (loading) {
    const body =
      delayMs > 0 ? (
        <Delayed show delayMs={delayMs}>
          {fallback}
        </Delayed>
      ) : (
        fallback
      );
    return (
      <div role="status" aria-busy="true" aria-live="polite" className={className}>
        <span className="sr-only">{label}…</span>
        {body}
      </div>
    );
  }

  return <ContentIn className={className}>{children}</ContentIn>;
}
