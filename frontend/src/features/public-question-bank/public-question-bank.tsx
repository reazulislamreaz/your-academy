'use client';

import Link from 'next/link';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ListCardSkeleton, LoadError } from '@/components/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { apiFetch } from '@/lib/api/client';
import { listPublicQuestionSets } from '@/lib/api/public-questions';
import type { CategoryNode } from '@/lib/api/types';
import { cn } from '@/lib/utils';

type Props = {
  initialQ?: string;
  initialCategoryId?: string;
  className?: string;
};

function formatUploadDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Debounced live search — updates after typing pauses. */
function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/** Preli landing: Exam Sets only (name + upload date). Questions live on the set page. */
export function PublicQuestionBank({
  initialQ = '',
  initialCategoryId = '',
  className,
}: Props) {
  const [qInput, setQInput] = useState(initialQ);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const q = useDebouncedValue(qInput.trim(), 280);

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories', { skipRefresh: true }),
    staleTime: 60_000,
  });

  const list = useInfiniteQuery({
    queryKey: ['public-question-sets', q, categoryId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listPublicQuestionSets({
        cursor: pageParam,
        limit: 20,
        q: q || undefined,
        categoryId: categoryId || undefined,
      }),
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
  });

  const sets = list.data?.pages.flatMap((p) => p.data) ?? [];
  const total = list.data?.pages[0]?.pagination?.total;
  const hasFilters = Boolean(q || categoryId);

  return (
    <div className={cn('space-y-5', className)}>
      <div className="rounded-[1.25rem] border border-[var(--line)] bg-white p-3 shadow-[var(--shadow-sm)] sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[var(--muted)]"
              aria-hidden
            />
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search collections by name…"
              aria-label="Search collections"
              className={cn(
                'h-12 w-full rounded-full border border-[var(--line)] bg-[var(--bg-muted)]',
                'pr-11 pl-11 text-sm text-[var(--ink)] outline-none',
                'placeholder:text-[var(--muted-strong)]',
                'transition-[border-color,box-shadow,background-color] duration-[var(--duration-fast)]',
                'focus:border-[var(--accent)] focus:bg-white focus:shadow-[var(--focus-ring)]',
              )}
            />
            {qInput ? (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute top-1/2 right-3 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--ink)]"
                onClick={() => setQInput('')}
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>

          <div className="flex w-full items-center gap-2 lg:w-auto">
            <label htmlFor="preli-category" className="sr-only">
              Filter by category
            </label>
            <Select
              id="preli-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-12 min-w-0 flex-1 rounded-full border-[var(--line)] bg-[var(--bg-muted)] px-4 shadow-none lg:w-[15rem] lg:flex-none"
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {hasFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 cursor-pointer rounded-full"
                onClick={() => {
                  setQInput('');
                  setCategoryId('');
                }}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </div>
        {typeof total === 'number' ? (
          <p className="mt-3 px-1 text-xs font-medium text-[var(--muted-strong)]">
            {list.isFetching && !list.isFetchingNextPage
              ? 'Updating…'
              : `${total} collection${total === 1 ? '' : 's'}`}
          </p>
        ) : null}
      </div>

      {list.isLoading ? <ListCardSkeleton rows={5} /> : null}

      {list.isError ? (
        <LoadError
          message="Could not load collections. Please try again."
          onRetry={() => void list.refetch()}
        />
      ) : null}

      {!list.isLoading && !list.isError && sets.length === 0 ? (
        <EmptyState
          align="center"
          title={hasFilters ? 'No matching collections' : 'No collections yet'}
          description={
            hasFilters
              ? 'Try a different search or category.'
              : 'Published uploads will appear here.'
          }
        />
      ) : null}

      <ul className="space-y-3">
        {sets.map((set) => (
          <li key={set.id}>
            <Link
              href={`/preli-question-bank/${set.id}`}
              className="block rounded-[1rem] border border-[var(--line)] bg-white px-5 py-4 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-[var(--highlight)] hover:shadow-[var(--shadow)]"
            >
              <h2 className="font-display text-lg font-bold tracking-tight text-[var(--ink)] sm:text-xl">
                {set.title}
              </h2>
              <p className="mt-1.5 text-sm text-[var(--muted-strong)]">
                {formatUploadDate(set.uploadedAt)}
                {set.subject ? ` · ${set.subject}` : ''}
                {set.questionCount > 0
                  ? ` · ${set.questionCount} question${set.questionCount === 1 ? '' : 's'}`
                  : ''}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {list.hasNextPage ? (
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={list.isFetchingNextPage}
            onClick={() => void list.fetchNextPage()}
          >
            {list.isFetchingNextPage ? 'Loading…' : 'Load more collections'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
