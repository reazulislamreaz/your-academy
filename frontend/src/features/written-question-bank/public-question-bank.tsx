'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ListCardSkeleton, LoadError } from '@/components/loading';
import { GoForExamCta } from '@/components/marketing/go-for-exam-cta';
import { GsapReveal } from '@/components/motion/gsap-reveal';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { SearchField } from '@/components/ui/search-field';
import { Select } from '@/components/ui/select';
import {
  fetchPublicCategories,
  flattenSubcategories,
  publicCategoriesQueryKey,
} from '@/lib/api/categories';
import {
  listPublicWrittenQuestionSetYears,
  listPublicWrittenQuestionSets,
} from '@/lib/api/written-questions';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  /** Listing + set routes root. Marketing default; learner uses `/written`. */
  basePath?: string;
  /** Hide homepage marketing CTAs when nested in the learner shell. */
  embedded?: boolean;
};

const filterControlClass =
  'relative z-10 min-h-12 min-w-0 cursor-pointer rounded-full border-[var(--line)] bg-[var(--bg-muted)] px-4 py-2 leading-normal shadow-none transition-[border-color,background-color,color] duration-150 hover:border-[var(--line-strong)] focus:border-[var(--accent)]';

function buildBankHref(
  pathname: string,
  next: {
    q?: string;
    categoryId?: string;
    subcategoryId?: string;
    year?: string;
  },
): string {
  const sp = new URLSearchParams();
  if (next.q) sp.set('q', next.q);
  if (next.categoryId) sp.set('categoryId', next.categoryId);
  if (next.subcategoryId) sp.set('subcategoryId', next.subcategoryId);
  if (next.year) sp.set('year', next.year);
  const qs = sp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Written bank landing: question sets only (name + upload date). Questions live on the set page. */
export function WrittenQuestionBank({
  className,
  basePath = '/written-question-bank',
  embedded = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const bankRoot = basePath.replace(/\/$/, '') || '/written-question-bank';

  // URL is the source of truth (navbar subcategory/category links, back/forward, refresh).
  // Category filter UI is intentionally omitted — subcategory + year only (same as Preli).
  const appliedQ = searchParams.get('q') ?? '';
  const appliedCategoryId = searchParams.get('categoryId') ?? '';
  const appliedSubcategoryId = searchParams.get('subcategoryId') ?? '';
  const appliedYear = searchParams.get('year') ?? '';

  const [qInput, setQInput] = useState(appliedQ);
  const debouncedQ = useDebouncedValue(qInput.trim(), 350);
  const skipSearchUrlWrite = useRef(false);

  useEffect(() => {
    skipSearchUrlWrite.current = true;
    setQInput(appliedQ);
  }, [appliedQ]);

  useEffect(() => {
    if (skipSearchUrlWrite.current) {
      skipSearchUrlWrite.current = false;
      return;
    }
    if (debouncedQ === appliedQ) return;
    router.replace(
      buildBankHref(pathname, {
        q: debouncedQ || undefined,
        categoryId: appliedCategoryId || undefined,
        subcategoryId: appliedSubcategoryId || undefined,
        year: appliedYear || undefined,
      }),
      { scroll: false },
    );
  }, [
    debouncedQ,
    appliedQ,
    appliedCategoryId,
    appliedSubcategoryId,
    appliedYear,
    pathname,
    router,
  ]);

  const categories = useQuery({
    queryKey: publicCategoriesQueryKey('WRITTEN'),
    queryFn: () => fetchPublicCategories('WRITTEN'),
    staleTime: 60_000,
  });

  const yearsQ = useQuery({
    queryKey: ['public-written-question-set-years'],
    queryFn: listPublicWrittenQuestionSetYears,
    staleTime: 60_000,
  });

  /** Flat Written subcategory list only (Preliminary taxonomy never included). */
  const subcategoryOptions = useMemo(
    () => flattenSubcategories(categories.data ?? []),
    [categories.data],
  );

  const selectedSubcategory = useMemo(
    () => subcategoryOptions.find((s) => s.id === appliedSubcategoryId) ?? null,
    [subcategoryOptions, appliedSubcategoryId],
  );

  const yearOptions = useMemo(() => {
    const fromApi = (yearsQ.data ?? []).map((y) => y.trim()).filter(Boolean);
    return [...new Set(fromApi)].sort((a, b) => Number(b) - Number(a) || b.localeCompare(a));
  }, [yearsQ.data]);

  // Drop invalid subcategory once catalog loads (keeps shareable URLs honest).
  useEffect(() => {
    if (categories.isLoading || categories.isError) return;
    if (appliedSubcategoryId && subcategoryOptions.length > 0 && !selectedSubcategory) {
      router.replace(
        buildBankHref(pathname, {
          q: appliedQ || undefined,
          categoryId: appliedCategoryId || undefined,
          year: appliedYear || undefined,
        }),
        { scroll: false },
      );
    }
  }, [
    categories.isLoading,
    categories.isError,
    appliedSubcategoryId,
    subcategoryOptions.length,
    selectedSubcategory,
    appliedQ,
    appliedCategoryId,
    appliedYear,
    pathname,
    router,
  ]);

  useEffect(() => {
    if (yearsQ.isLoading || yearsQ.isError) return;
    if (appliedYear && yearOptions.length > 0 && !yearOptions.includes(appliedYear)) {
      router.replace(
        buildBankHref(pathname, {
          q: appliedQ || undefined,
          categoryId: appliedCategoryId || undefined,
          subcategoryId: appliedSubcategoryId || undefined,
        }),
        { scroll: false },
      );
    }
  }, [
    yearsQ.isLoading,
    yearsQ.isError,
    appliedYear,
    yearOptions,
    appliedQ,
    appliedCategoryId,
    appliedSubcategoryId,
    pathname,
    router,
  ]);

  const list = useInfiniteQuery({
    queryKey: [
      'public-written-question-sets',
      appliedQ,
      appliedCategoryId,
      appliedSubcategoryId,
      appliedYear,
    ],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listPublicWrittenQuestionSets({
        cursor: pageParam,
        limit: 20,
        q: appliedQ || undefined,
        categoryId: appliedCategoryId || undefined,
        subcategoryId: appliedSubcategoryId || undefined,
        year: appliedYear || undefined,
      }),
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const sets = list.data?.pages.flatMap((p) => p.data) ?? [];
  const total = list.data?.pages[0]?.pagination?.total;
  const showListSkeleton = list.isLoading && !list.isPlaceholderData;
  const hasFilters = Boolean(appliedQ || appliedCategoryId || appliedSubcategoryId || appliedYear);

  const replaceFilters = (next: {
    q?: string;
    categoryId?: string;
    subcategoryId?: string;
    year?: string;
  }) => {
    router.replace(buildBankHref(pathname, next), { scroll: false });
  };

  const clearFilters = () => {
    skipSearchUrlWrite.current = true;
    setQInput('');
    router.replace(pathname, { scroll: false });
  };

  return (
    <div className={cn('space-y-5', className)}>
      {embedded ? null : <GoForExamCta />}

      <GsapReveal className="relative z-10 rounded-[1.25rem] border border-[var(--line)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-sm)] sm:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchField
              value={qInput}
              onChange={setQInput}
              placeholder="Search Written collections by title or subcategory…"
              aria-label="Search Written collections by title or subcategory"
              variant="pill"
              className="relative z-10 min-w-0 flex-1"
              onClear={() => {
                skipSearchUrlWrite.current = true;
                replaceFilters({
                  categoryId: appliedCategoryId || undefined,
                  subcategoryId: appliedSubcategoryId || undefined,
                  year: appliedYear || undefined,
                });
              }}
            />

            <div className="relative z-10 grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:flex lg:w-auto lg:shrink-0 lg:flex-wrap lg:items-center">
              <label htmlFor="written-subcategory" className="sr-only">
                Filter by subcategory
              </label>
              <Select
                id="written-subcategory"
                value={appliedSubcategoryId}
                onChange={(e) => {
                  const subcategoryId = e.target.value;
                  replaceFilters({
                    q: appliedQ || undefined,
                    // Subcategory alone is enough — backend resolves WRITTEN scope + parent.
                    subcategoryId: subcategoryId || undefined,
                    year: appliedYear || undefined,
                  });
                }}
                disabled={categories.isLoading}
                className={cn(
                  filterControlClass,
                  'w-full min-[420px]:min-w-0 lg:w-[16rem] lg:flex-none',
                  appliedSubcategoryId &&
                    'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]',
                )}
                aria-label="Filter by Written subcategory"
              >
                <option value="">All Subcategories</option>
                {subcategoryOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>

              <label htmlFor="written-year" className="sr-only">
                Filter by exam year
              </label>
              <Select
                id="written-year"
                value={appliedYear}
                onChange={(e) => {
                  const year = e.target.value;
                  replaceFilters({
                    q: appliedQ || undefined,
                    categoryId: appliedCategoryId || undefined,
                    subcategoryId: appliedSubcategoryId || undefined,
                    year: year || undefined,
                  });
                }}
                disabled={yearsQ.isLoading}
                className={cn(
                  filterControlClass,
                  'w-full min-[420px]:min-w-0 lg:w-[11rem] lg:flex-none',
                  appliedYear &&
                    'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]',
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
                  className="min-h-11 w-full cursor-pointer rounded-full min-[420px]:col-span-2 lg:col-span-1 lg:w-auto lg:shrink-0"
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
              {appliedYear ? ` · ${appliedYear}` : ''}
            </p>
          ) : null}
        </div>
      </GsapReveal>

      {showListSkeleton ? <ListCardSkeleton rows={5} /> : null}

      {list.isError ? (
        <LoadError
          message="Could not load Written collections. Please try again."
          onRetry={() => void list.refetch()}
        />
      ) : null}

      {!showListSkeleton && !list.isError && sets.length === 0 ? (
        <EmptyState
          align="center"
          title={hasFilters ? 'No matching collections' : 'No collections yet'}
          description={
            hasFilters
              ? 'Try a different search, subcategory, or year.'
              : 'Published Written uploads will appear here.'
          }
        />
      ) : null}

      <GsapReveal staggerChildren y={12}>
        <ul
          className={cn(
            'space-y-3 transition-opacity duration-150',
            list.isFetching && !list.isFetchingNextPage && list.isPlaceholderData
              ? 'opacity-60'
              : 'opacity-100',
          )}
          aria-busy={list.isFetching && !list.isFetchingNextPage}
        >
          {sets.map((set) => (
            <li key={set.id} data-gsap-stagger>
              <Link
                href={`${bankRoot}/${set.id}`}
                className="motion-hover-lift block cursor-pointer rounded-[1rem] border border-[var(--line)] bg-[var(--bg-elevated)] px-5 py-4 shadow-[var(--shadow-sm)] transition-all hover:border-[var(--highlight)] hover:shadow-[var(--shadow)]"
              >
                <h2 className="font-display text-lg font-bold tracking-tight text-[var(--ink)] sm:text-xl">
                  {set.title}
                </h2>
              </Link>
            </li>
          ))}
        </ul>
      </GsapReveal>

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
