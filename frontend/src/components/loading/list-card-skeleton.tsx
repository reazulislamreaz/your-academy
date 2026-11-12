import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Soft list-card placeholders for marketing / public banks (avoids crude pulse blocks). */
export function ListCardSkeleton({
  rows = 4,
  className,
  rowClassName,
}: {
  rows?: number;
  className?: string;
  rowClassName?: string;
}) {
  return (
    <ul className={cn('space-y-3', className)} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <li
          key={i}
          className={cn(
            'rounded-[1rem] border border-[var(--line)] bg-[var(--bg-elevated)] px-5 py-4 shadow-[var(--shadow-sm)]',
            rowClassName,
          )}
        >
          <Skeleton className="h-5 w-2/3 max-w-md" />
          <Skeleton className="mt-3 h-3.5 w-40" />
        </li>
      ))}
    </ul>
  );
}
