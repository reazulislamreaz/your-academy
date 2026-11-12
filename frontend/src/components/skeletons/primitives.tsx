import type { HTMLAttributes, ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { cn } from '@/lib/utils';

/** Accessible page/section loading shell. */
export function SkStatus({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function SkLine({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn('h-3.5 rounded-md', className)} {...props} />;
}

export function SkTitle({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn('h-7 rounded-md sm:h-8', className)} {...props} />;
}

export function SkCircle({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn('shrink-0 rounded-full', className)} {...props} />;
}

export function SkButton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn('h-11 rounded-[var(--radius)]', className)} {...props} />;
}

export function SkPill({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn('h-9 rounded-full', className)} {...props} />;
}

export function SkBadge({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn('h-6 w-16 rounded-[var(--radius-sm)]', className)} {...props} />;
}

/** Mirrors `PageHeader` spacing / border / responsive action slot. */
export function PageHeaderSkeleton({
  withActions,
  className,
}: {
  withActions?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <span className="inline-block h-[3px] w-5 shrink-0 rounded-full bg-[var(--highlight)]/40" />
          <SkLine className="h-3 w-20" />
        </div>
        <SkTitle className="w-48 sm:w-72" />
        <SkLine className="h-4 w-full max-w-xl" />
      </div>
      {withActions ? (
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <SkPill className="w-28" />
          <SkPill className="w-24" />
        </div>
      ) : null}
    </div>
  );
}

/** MetricTile footprint — icon chip + value + label. */
export function MetricTileSkeletonExact({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2.5 rounded-[14px] border border-[var(--line)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-sm)] sm:gap-3 sm:p-4',
        className,
      )}
    >
      <Skeleton className="size-9 shrink-0 rounded-lg sm:size-10" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-6 w-14 sm:h-7" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

/** StatCard footprint used on admin / bulk upload. */
export function StatCardSkeletonExact({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative min-w-0 overflow-hidden rounded-[16px] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)] sm:p-5',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-16 sm:h-9" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="size-9 shrink-0 rounded-xl sm:size-10" />
      </div>
    </div>
  );
}

/** Practice set card — badges, title, meta row, CTA. */
export function PracticeSetCardSkeletonExact({ className }: { className?: string }) {
  return (
    <Surface className={cn('p-4', className)}>
      <div className="flex flex-wrap gap-1.5">
        <SkBadge className="w-20" />
        <SkBadge className="w-16" />
      </div>
      <Skeleton className="mt-2 h-5 w-3/4 max-w-[16rem]" />
      <Skeleton className="mt-2 h-3.5 w-full" />
      <Skeleton className="mt-1.5 h-3.5 w-2/3" />
      <div className="mt-3 flex flex-wrap gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="mt-4 h-4 w-24" />
    </Surface>
  );
}

export function PracticeSetGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <SkStatus label="Loading practice sets…" className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <PracticeSetCardSkeletonExact key={i} />
      ))}
    </SkStatus>
  );
}
