import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { PerformanceByCategory } from '@/lib/api/types';

type Props = {
  items: PerformanceByCategory[];
};

export function SubjectProgress({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="rounded-[var(--radius)] border border-dashed border-[var(--line-strong)] px-4 py-8 text-center text-sm text-[var(--muted)]">
        Subject accuracy appears after you check answers in practice.
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {items.map((row) => (
        <li key={row.categoryId}>
          <Link
            href={`/questions?categoryId=${row.categoryId}`}
            className="group flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-[var(--bg-muted)]"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-[var(--ink)] group-hover:underline">
                  {row.name}
                </p>
                <p className="shrink-0 text-xs tabular-nums text-[var(--muted)]">
                  {row.accuracyPercent}%
                </p>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-muted)]">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    row.accuracyPercent >= 70
                      ? 'bg-[var(--success)]'
                      : row.accuracyPercent >= 40
                        ? 'bg-[var(--info)]'
                        : 'bg-[var(--highlight)]',
                  )}
                  style={{ width: `${Math.max(4, row.accuracyPercent)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                {row.correct}/{row.attempts} correct
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
