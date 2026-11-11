import type { HTMLAttributes, ReactNode } from 'react';
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
}: SkeletonRegionProps) {
  if (loading) {
    return (
      <div role="status" aria-busy="true" aria-live="polite" className={className}>
        <span className="sr-only">{label}…</span>
        {fallback}
      </div>
    );
  }

  return <ContentIn className={className}>{children}</ContentIn>;
}
