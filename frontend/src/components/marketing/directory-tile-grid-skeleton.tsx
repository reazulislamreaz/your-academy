import { Skeleton } from '@/components/ui/skeleton';

export function DirectoryTileGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:gap-4">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <div className="flex min-h-[8.5rem] flex-col items-center justify-center gap-2.5 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] px-2 py-5 shadow-[var(--shadow-sm)]">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-14" />
          </div>
        </li>
      ))}
    </ul>
  );
}
