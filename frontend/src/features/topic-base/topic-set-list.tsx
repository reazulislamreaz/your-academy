'use client';

import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ListCardSkeleton, LoadError } from '@/components/loading';
import { Button } from '@/components/ui/button';
import { listTopicSets } from '@/lib/api/topic-questions';
import { cn } from '@/lib/utils';

type Props = {
  folderId: string;
  className?: string;
  /** Collection question view root. Marketing default; learner uses `/topics/sets`. */
  setBasePath?: string;
};

const PAGE_SIZE = 20;

/**
 * Preli/Written-style title rows for Topic upload batches on a leaf folder.
 * Renders nothing when the folder has no uploaded sets (no filler empty state).
 */
export function TopicSetList({
  folderId,
  className,
  setBasePath = '/topic-base/sets',
}: Props) {
  const setRoot = setBasePath.replace(/\/$/, '') || '/topic-base/sets';
  const sets = useInfiniteQuery({
    queryKey: ['topic-sets', folderId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listTopicSets(folderId, { cursor: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
    staleTime: 30_000,
  });

  if (sets.isLoading) {
    return <ListCardSkeleton rows={4} className={className} />;
  }

  if (sets.isError) {
    return (
      <LoadError
        message="Could not load collections."
        onRetry={() => void sets.refetch()}
        className={className}
      />
    );
  }

  const items = sets.data?.pages.flatMap((p) => p.data) ?? [];
  if (items.length === 0) return null;

  return (
    <div className={cn('space-y-3', className)}>
      <ul className="space-y-3">
        {items.map((set) => (
          <li key={set.id}>
            <Link
              href={`${setRoot}/${encodeURIComponent(set.id)}`}
              className="block rounded-[1rem] border border-[var(--line)] bg-[var(--bg-elevated)] px-5 py-4 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-[var(--highlight)] hover:shadow-[var(--shadow)]"
            >
              <h2 className="font-display text-lg font-bold tracking-tight text-[var(--ink)] sm:text-xl">
                {set.title}
              </h2>
            </Link>
          </li>
        ))}
      </ul>

      {sets.hasNextPage ? (
        <div className="flex justify-center pt-1">
          <Button
            type="button"
            variant="outline"
            className="h-9"
            disabled={sets.isFetchingNextPage}
            onClick={() => void sets.fetchNextPage()}
          >
            {sets.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
