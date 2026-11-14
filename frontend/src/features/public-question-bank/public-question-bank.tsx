'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ListCardSkeleton, LoadError } from '@/components/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { apiFetch } from '@/lib/api/client';
import {
  listPublicQuestionSetYears,
  listPublicQuestionSets,
} from '@/lib/api/public-questions';
import type { CategoryNode } from '@/lib/api/types';
import { cn } from '@/lib/utils';

type Props = {
  initialQ?: string;
  initialSubcategoryId?: string;
  initialYear?: string;
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

const filterControlClass =
  'h-12 min-w-0 rounded-full border-[var(--line)] bg-[var(--bg-muted)] px-4 shadow-none';

/** Preli landing: Exam Sets only (name + upload date). Questions live on the set page. */
export function PublicQuestionBank({
  initialQ = '',
  initialSubcategoryId = '',
  initialYear = '',
  className,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [qInput, setQInput] = useState(initialQ);
  const [subcategoryId, setSubcategoryId] = useState(initialSubcategoryId);
  const [year, setYear] = useState(initialYear);
  const q = useDebouncedValue(qInput.trim(), 280);

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories', { skipRefresh: true }),
    staleTime: 60_000,
  });

  const yearsQ = useQuery({
    queryKey: ['public-question-set-years'],
    queryFn: listPublicQuestionSetYears,
    staleTime: 60_000,
  });

  /** Flat subcategory list (category dropdown removed; search covers category names). */
  const subcategoryOptions = useMemo(() => {
    const roots = categories.data ?? [];
    const items: Array<{ id: string; name: string; label: string }> = [];
    for (const root of roots) {
      for (const child of root.children ?? []) {
        items.push({
          id: child.id,
          name: child.name,
          label: `${root.name} · ${child.name}`,
        });
      }
    }
    return items.sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
    );
  }, [categories.data]);

  const selectedSubcategory = useMemo(
    () => subcategoryOptions.find((s) => s.id === subcategoryId) ?? null,
    [subcategoryOptions, subcategoryId],
  );

  const yearOptions = useMemo(() => {
    const fromApi = (yearsQ.data ?? []).map((y) => y.trim()).filter(Boolean);
    return [...new Set(fromApi)].sort(
      (a, b) => Number(b) - Number(a) || b.localeCompare(a),
    );
  }, [yearsQ.data]);

  // Drop invalid subcategory once catalog loads.
  useEffect(() => {
    if (categories.isLoading || categories.isError) return;
    if (subcategoryId && subcategoryOptions.length > 0 && !selectedSubcategory) {
      setSubcategoryId('');
    }
  }, [
    categories.isLoading,
    categories.isError,
    subcategoryId,
    subcategoryOptions.length,
    selectedSubcategory,
  ]);

  // Drop invalid year once catalog loads.
  useEffect(() => {
    if (yearsQ.isLoading || yearsQ.isError) return;
    if (year && yearOptions.length > 0 && !yearOptions.includes(year)) {
      setYear('');
    }
  }, [yearsQ.isLoading, yearsQ.isError, year, yearOptions]);

  // Sync shareable URL with active filters.
  useEffect(() => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (subcategoryId) sp.set('subcategoryId', subcategoryId);
    if (year) sp.set('year', year);
    const next = sp.toString() ? `${pathname}?${sp}` : pathname;
    router.replace(next, { scroll: false });
  }, [q, subcategoryId, year, pathname, router]);

  const list = useInfiniteQuery({
    queryKey: ['public-question-sets', q, subcategoryId, year],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listPublicQuestionSets({
        cursor: pageParam,
        limit: 20,
        q: q || undefined,
        subcategoryId: subcategoryId || undefined,
        year: year || undefined,
      }),
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
  });

  const sets = list.data?.pages.flatMap((p) => p.data) ?? [];
  const total = list.data?.pages[0]?.pagination?.total;
  const hasFilters = Boolean(q || subcategoryId || year);

  const clearFilters = () => {
    setQInput('');
    setSubcategoryId('');
    setYear('');
  };

  return (
    <div className={cn('space-y-5', className)}>
      <div className="rounded-[1.25rem] border border-[var(--line)] bg-white p-3 shadow-[var(--shadow-sm)] sm:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[var(--muted)]"
                aria-hidden
              />
              <input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Search by title, category, or subcategory…"
                aria-label="Search collections by title, category, or subcategory"
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

            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:shrink-0">
              <label htmlFor="preli-subcategory" className="sr-only">
                Filter by subcategory
              </label>
              <Select
                id="preli-subcategory"
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                disabled={categories.isLoading}
                className={cn(
                  filterControlClass,
                  'flex-1 sm:min-w-[12rem] lg:w-[16rem] lg:flex-none',
                  subcategoryId &&
                    'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]',
                )}
                aria-label="Filter by subcategory"
              >
                <option value="">All Subcategories</option>
                {subcategoryOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>

              <label htmlFor="preli-year" className="sr-only">
                Filter by exam year
              </label>
              <Select
                id="preli-year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                disabled={yearsQ.isLoading}
                className={cn(
                  filterControlClass,
                  'flex-1 sm:min-w-[9rem] lg:w-[11rem] lg:flex-none',
                  year && 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]',
                )}
                aria-label="Filter by exam year"
              >
                <option value="">All Years</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>

              {hasFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 cursor-pointer rounded-full"
                  onClick={clearFilters}
                >
                  Clear
                </Button>
              ) : null}
            </div>
          </div>

          {typeof total === 'number' ? (
            <p className="px-1 text-xs font-medium text-[var(--muted-strong)]">
              {list.isFetching && !list.isFetchingNextPage
                ? 'Updating…'
                : `${total} collection${total === 1 ? '' : 's'}`}
              {selectedSubcategory ? ` · ${selectedSubcategory.name}` : ''}
              {year ? ` · ${year}` : ''}
            </p>
          ) : null}
        </div>
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
              ? 'Try a different search, subcategory, or year.'
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
                {set.examYear ? ` · ${set.examYear}` : ''}
                {` · ${set.questionCount} question${set.questionCount === 1 ? '' : 's'}`}
              </p>
              {set.placements.length > 0 ? (
                <p className="mt-1.5 text-xs text-[var(--muted)]">
                  Also in: {set.placements.map((p) => p.subcategoryName).join(', ')}
                </p>
              ) : null}
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
            {list.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
