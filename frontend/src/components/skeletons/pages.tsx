import { Surface } from '@/components/ui/surface';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChartSkeleton,
  ChartSkeleton,
  ContentCardSkeleton,
  MetricTileSkeleton,
  StatCardSkeleton,
  SubjectProgressSkeleton,
} from '@/components/skeletons/cards';
import { ListRowsSkeleton, UserListSkeleton } from '@/components/skeletons/tables';
import {
  BulkQuestionPreviewSkeleton,
  QuestionListSkeleton,
} from '@/components/skeletons/questions';
import { cn } from '@/lib/utils';

/** Learner `/home` initial shell — hero, KPI tiles, continue + chart. */
export function DashboardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)} role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading dashboard…</span>
      <Surface className="space-y-3 p-5 sm:p-6">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-56 sm:w-72" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <div className="flex flex-wrap gap-2 pt-1">
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
      </Surface>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricTileSkeleton key={`a-${i}`} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricTileSkeleton key={`b-${i}`} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Surface className="space-y-4 p-4 sm:p-5 lg:col-span-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-24 w-full rounded-[var(--radius)]" />
          <div className="grid gap-2 sm:grid-cols-2">
            <Skeleton className="h-16 w-full rounded-[12px]" />
            <Skeleton className="h-16 w-full rounded-[12px]" />
          </div>
        </Surface>
        <Surface className="space-y-3 p-4 sm:p-5 lg:col-span-2">
          <Skeleton className="h-4 w-28" />
          <ChartSkeleton />
        </Surface>
      </div>
    </div>
  );
}

/** Admin platform overview — header + 8 KPI cards + queue panels. */
export function AdminDashboardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-8', className)} role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading admin overview…</span>
      <div className="space-y-2 border-b border-[var(--line)] pb-6">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Surface className="space-y-3 p-4 sm:p-5">
          <Skeleton className="h-4 w-32" />
          <ListRowsSkeleton rows={4} />
        </Surface>
        <Surface className="space-y-3 p-4 sm:p-5">
          <Skeleton className="h-4 w-36" />
          <ListRowsSkeleton rows={4} />
        </Surface>
      </div>
    </div>
  );
}

/** Profile / settings form panels. */
export function FormSkeleton({ fields = 4, className }: { fields?: number; className?: string }) {
  return (
    <Surface className={cn('space-y-4 p-4 sm:p-5', className)}>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-64 max-w-full" />
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-11 w-full rounded-[var(--radius)]" />
        </div>
      ))}
      <Skeleton className="h-11 w-32 rounded-[var(--radius)]" />
    </Surface>
  );
}

/** Access / trial / membership callout placeholders. */
export function SubscriptionSkeleton({ className }: { className?: string }) {
  return (
    <Surface className={cn('space-y-3 border-l-[3px] border-l-[var(--highlight)] p-5 sm:p-6', className)}>
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-6 w-56" />
      <Skeleton className="h-4 w-full max-w-lg" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>
    </Surface>
  );
}

/** Admin user detail / profile summary (no dedicated route yet — reusable panel). */
export function UserDetailsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      <Surface className="flex flex-wrap items-center gap-4 p-5">
        <Skeleton className="size-16 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-56" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      </Surface>
      <div className="grid gap-4 md:grid-cols-2">
        <SubscriptionSkeleton />
        <FormSkeleton fields={3} />
      </div>
      <UserListSkeleton rows={4} />
    </div>
  );
}

/** Bulk upload hub — KPI row + filters + collection table. */
export function BulkUploadSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading bulk uploads…</span>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <Surface className="space-y-3 p-4 sm:p-5">
        <Skeleton className="h-4 w-36" />
        <ListRowsSkeleton rows={3} />
      </Surface>
      <Surface className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-40 rounded-[var(--radius)]" />
          <Skeleton className="h-10 w-32 rounded-[var(--radius)]" />
          <Skeleton className="h-10 w-28 rounded-[var(--radius)]" />
        </div>
        <ListRowsSkeleton rows={5} />
      </Surface>
    </div>
  );
}

/** Bulk upload detail — summary chips + preview table. */
export function BulkUploadDetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)} role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading upload details…</span>
      <div className="space-y-2 border-b border-[var(--line)] pb-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Surface key={i} className="space-y-2 p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-12" />
          </Surface>
        ))}
      </div>
      <Surface className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-24 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-6 w-20 rounded-[var(--radius-sm)]" />
        </div>
        <Skeleton className="h-20 w-full rounded-[12px]" />
      </Surface>
      <Surface className="space-y-4 p-4 sm:p-5">
        <Skeleton className="h-5 w-40" />
        <BulkQuestionPreviewSkeleton rows={4} />
      </Surface>
    </div>
  );
}

/** News / documents browse grid. */
export function ContentGridSkeleton({
  cards = 6,
  className,
}: {
  cards?: number;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: cards }).map((_, i) => (
        <ContentCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Question bank page body (count line + rows). */
export function QuestionBankSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)} role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading questions…</span>
      <Skeleton className="h-4 w-48" />
      <QuestionListSkeleton />
    </div>
  );
}

/** Secondary dashboard panels used after shell is ready. */
export function DashboardPanelsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2', className)}>
      <Surface className="space-y-3 p-4 sm:p-5">
        <Skeleton className="h-4 w-36" />
        <SubjectProgressSkeleton />
      </Surface>
      <Surface className="space-y-3 p-4 sm:p-5">
        <Skeleton className="h-4 w-24" />
        <BarChartSkeleton />
      </Surface>
    </div>
  );
}
