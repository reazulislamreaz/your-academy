'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ListCardSkeleton, LoadError } from '@/components/loading';
import { listTopicSets } from '@/lib/api/topic-questions';
import { topicSetHref } from '@/lib/homepage-tile-links';
import { cn } from '@/lib/utils';

type Props = {
  folderId: string;
  className?: string;
};

/**
 * Preli/Written-style title rows for Topic upload batches on a leaf folder.
 * Renders nothing when the folder has no uploaded sets (no filler empty state).
 */
export function TopicSetList({ folderId, className }: Props) {
  const sets = useQuery({
    queryKey: ['topic-sets', folderId],
    queryFn: () => listTopicSets(folderId),
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

  const items = sets.data ?? [];
  if (items.length === 0) return null;

  return (
    <ul className={cn('space-y-3', className)}>
      {items.map((set) => (
        <li key={set.id}>
          <Link
            href={topicSetHref(set.id)}
            className="block rounded-[1rem] border border-[var(--line)] bg-[var(--bg-elevated)] px-5 py-4 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-[var(--highlight)] hover:shadow-[var(--shadow)]"
          >
            <h2 className="font-display text-lg font-bold tracking-tight text-[var(--ink)] sm:text-xl">
              {set.title}
            </h2>
          </Link>
        </li>
      ))}
    </ul>
  );
}
