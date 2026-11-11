import { Surface } from '@/components/ui/surface';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Matches `StatCard` footprint (label + value + optional hint + icon chip). */
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative min-w-0 overflow-hidden rounded-[16px] border border-[var(--line)] bg-white p-4 sm:p-5',
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

/** Matches compact `MetricTile` (icon chip + value + label). */
export function MetricTileSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2.5 rounded-[14px] border border-[var(--line)] bg-white p-3 sm:gap-3 sm:p-4',
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

/** News / document / practice browse card. */
export function ContentCardSkeleton({ className }: { className?: string }) {
  return (
    <Surface className={cn('space-y-3 p-4', className)}>
      <div className="flex gap-3">
        <Skeleton className="size-14 shrink-0 rounded-[10px]" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4 max-w-[16rem]" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </Surface>
  );
}

/** Donut / bar chart panel body. */
export function ChartSkeleton({ className, height = 'h-48' }: { className?: string; height?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-4 py-2', className)}>
      <Skeleton className={cn('w-full max-w-[11rem] rounded-full', height === 'h-48' ? 'size-40' : height)} />
      <div className="flex w-full justify-center gap-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

/** Horizontal bar chart rows. */
export function BarChartSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <ul className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="space-y-1.5">
          <div className="flex justify-between gap-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-10" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
        </li>
      ))}
    </ul>
  );
}

/** Subject progress list rows. */
export function SubjectProgressSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <ul className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="space-y-1.5">
          <div className="flex justify-between gap-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
        </li>
      ))}
    </ul>
  );
}
