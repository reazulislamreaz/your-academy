import { PageHeaderSkeleton, SkLine } from '@/components/skeletons';

/** Generic in-shell transition — not home-shaped, so every route feels intentional. */
export default function AppLoading() {
  return (
    <div className="space-y-6 p-1 sm:space-y-8" role="status" aria-busy="true" aria-label="Loading">
      <PageHeaderSkeleton />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-28 animate-pulse rounded-[var(--radius-lg)] bg-[var(--bg-muted)]" />
        <div className="h-28 animate-pulse rounded-[var(--radius-lg)] bg-[var(--bg-muted)]" />
      </div>
      <div className="space-y-3">
        <SkLine className="h-4 w-1/3" />
        <div className="h-16 animate-pulse rounded-[var(--radius)] bg-[var(--bg-muted)]" />
        <div className="h-16 animate-pulse rounded-[var(--radius)] bg-[var(--bg-muted)]" />
        <div className="h-16 animate-pulse rounded-[var(--radius)] bg-[var(--bg-muted)]" />
      </div>
    </div>
  );
}
