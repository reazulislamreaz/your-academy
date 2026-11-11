import { Surface } from '@/components/ui/surface';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type TableSkeletonProps = {
  columns?: number;
  rows?: number;
  className?: string;
  /** Show leading avatar/name stack in first column */
  withUser?: boolean;
};

/** Generic admin/data table placeholder matching thead + row rhythm. */
export function TableSkeleton({
  columns = 5,
  rows = 6,
  className,
  withUser = false,
}: TableSkeletonProps) {
  return (
    <Surface className={cn('overflow-hidden p-0', className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="bg-[var(--bg-desk)]">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-3 py-3 sm:px-5">
                  <Skeleton className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: columns }).map((_, c) => (
                  <td key={c} className="px-3 py-3.5 sm:px-5">
                    {withUser && c === 0 ? (
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    ) : c === columns - 1 ? (
                      <div className="flex justify-end">
                        <Skeleton className="h-8 w-20 rounded-full" />
                      </div>
                    ) : (
                      <Skeleton className={cn('h-3.5', c === 1 ? 'w-16' : 'w-20')} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}

/** Admin users table — avatar-less name/WhatsApp + badges + actions. */
export function UserListSkeleton({ rows = 8, className }: { rows?: number; className?: string }) {
  return <TableSkeleton columns={6} rows={rows} withUser className={className} />;
}

/** Compact list of table-like rows without full table chrome (practice sets, news). */
export function ListRowsSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-3 rounded-[12px] border border-[var(--line)] bg-white px-4 py-3"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3 max-w-[18rem]" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
