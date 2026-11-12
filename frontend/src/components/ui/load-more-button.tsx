'use client';

import { Button } from '@/components/ui/button';

type Props = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  label?: string;
  loadingLabel?: string;
  className?: string;
};

/** Shared “Load more” control for cursor-paginated lists. */
export function LoadMoreButton({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  label = 'Load more',
  loadingLabel = 'Loading…',
  className,
}: Props) {
  if (!hasNextPage) return null;
  return (
    <div className={className ?? 'flex justify-center pt-2'}>
      <Button
        type="button"
        variant="outline"
        className="rounded-[var(--radius)]"
        disabled={isFetchingNextPage}
        onClick={onLoadMore}
      >
        {isFetchingNextPage ? loadingLabel : label}
      </Button>
    </div>
  );
}
