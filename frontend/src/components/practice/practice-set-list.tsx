'use client';

import { useQuery } from '@tanstack/react-query';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { PracticeSetCard } from '@/components/practice/practice-set-card';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { PracticeSetListItem } from '@/lib/api/types';

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
  const qs = new URLSearchParams({ limit: '50' });
  if (kind) qs.set('kind', kind);
  if (examTag) qs.set('examTag', examTag);
  if (categoryId) qs.set('categoryId', categoryId);
  if (subcategoryId) qs.set('subcategoryId', subcategoryId);
  if (isDaily) qs.set('isDaily', 'true');

  const list = useQuery({
    queryKey: ['practice-sets', kind, examTag, categoryId, subcategoryId, isDaily],
    queryFn: () => apiFetch<PracticeSetListItem[]>(`/practice-sets?${qs}`),
    retry: false,
  });

  if (list.isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    );
  }

  if (list.error instanceof ApiError && (list.error.status === 401 || list.error.status === 403)) {
    return (
      <EmptyState
        title="Sign in required"
        description="Practice sets are available after you sign in."
        action={
          <a href="/login" className="text-sm font-semibold text-[var(--highlight)]">
            Sign in
          </a>
        }
      />
    );
  }

  if (list.isError) {
    return <Alert variant="danger">Could not load practice sets. Try again shortly.</Alert>;
  }

  const items = list.data ?? [];
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((set) => (
        <PracticeSetCard key={set.id} set={set} />
      ))}
    </div>
  );
}
