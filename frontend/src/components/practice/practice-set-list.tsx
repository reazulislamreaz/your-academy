'use client';

import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadMoreButton } from '@/components/ui/load-more-button';
import { PracticeSetGridSkeleton } from '@/components/skeletons';
import { PracticeSetCard } from '@/components/practice/practice-set-card';
import { ApiError } from '@/lib/api/client';
import type { PracticeSetListItem } from '@/lib/api/types';
import { useCursorList } from '@/lib/hooks/use-cursor-list';

type Props = {
  kind?: string;
  examTag?: string;
  categoryId?: string;
  subcategoryId?: string;
  isDaily?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function PracticeSetList({
  kind,
  examTag,
  categoryId,
  subcategoryId,
  isDaily,
  emptyTitle = 'No practice sets yet',
  emptyDescription = 'Published quizzes and model tests will appear here.',
}: Props) {
  const list = useCursorList<PracticeSetListItem>(
    ['practice-sets', kind, examTag, categoryId, subcategoryId, isDaily],
    (cursor) => {
      const qs = new URLSearchParams({ limit: '12' });
      if (kind) qs.set('kind', kind);
      if (examTag) qs.set('examTag', examTag);
      if (categoryId) qs.set('categoryId', categoryId);
      if (subcategoryId) qs.set('subcategoryId', subcategoryId);
      if (isDaily) qs.set('isDaily', 'true');
      if (cursor) qs.set('cursor', cursor);
      return `/practice-sets?${qs}`;
    },
    { retry: false },
  );

  if (list.isLoading) {
    return <PracticeSetGridSkeleton count={4} />;
  }

  if (list.error instanceof ApiError && (list.error.status === 401 || list.error.status === 403)) {
    return (
      <EmptyState
        title="Sign in required"
        description="Practice sets are available after you sign in."
        action={
          <Link href="/login" className="text-sm font-semibold text-[var(--highlight)] underline-offset-2 hover:underline">
            Sign in
          </Link>
        }
      />
    );
  }

  if (list.isError) {
    return <Alert variant="danger">Could not load practice sets. Try again shortly.</Alert>;
  }

  if (list.items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {list.items.map((set) => (
          <PracticeSetCard key={set.id} set={set} />
        ))}
      </div>
      <LoadMoreButton
        hasNextPage={list.hasNextPage}
        isFetchingNextPage={list.isFetchingNextPage}
        onLoadMore={() => void list.fetchNextPage()}
      />
    </div>
  );
}
