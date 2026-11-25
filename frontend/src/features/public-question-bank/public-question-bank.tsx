'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ListCardSkeleton, LoadError } from '@/components/loading';
import { LockedTag, useUnlockHref } from '@/components/access/locked-content';
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
import { PreliPracticeStartModal } from '@/features/preli-practice/preli-practice-start-modal';
import { savePreliPracticeSession } from '@/features/preli-practice/preli-practice-session';
import type { ApiResult } from '@/lib/api/client';
import {
  listPublicQuestionSetYears,
  listPublicQuestionSets,
  type PublicQuestionSet,
} from '@/lib/api/public-questions';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  /** Listing + set routes root. Marketing default; learner uses `/preli-questions` or `/preli-practice`. */
  basePath?: string;
  /** Hide homepage marketing CTAs when nested in the learner shell. */
  embedded?: boolean;
  /**
   * Server-fetched first page (no filters) so the collection list is in the server HTML for
   * search engines. Treated as stale: the browser refetches with the viewer's session at once.
   */
  initialSets?: ApiResult<PublicQuestionSet[]>;
  /**
   * Learner Preli Practice: clicking a set opens the timed-exam start modal
   * instead of navigating to the browse view.
   */
  timedPractice?: boolean;
};

const filterControlClass =
  'min-h-12 min-w-0 rounded-full border-[var(--line)] bg-[var(--bg-muted)] px-4 py-2 leading-normal shadow-none';

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

/** Preli landing: Exam Sets only (name + upload date). Questions live on the set page. */
export function PublicQuestionBank({
  className,
  basePath = '/preli-question-bank',
  embedded = false,
  initialSets,
  timedPractice = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const bankRoot = basePath.replace(/\/$/, '') || '/preli-question-bank';
  const unlockHref = useUnlockHref();
  const [practiceSet, setPracticeSet] = useState<{
    id: string;
    title: string;
    questionCount: number;
  } | null>(null);
  const [starting, setStarting] = useState(false);

  // URL is the source of truth for applied filters (category/topic links, back/forward, refresh).
  const appliedQ = searchParams.get('q') ?? '';
  const appliedCategoryId = searchParams.get('categoryId') ?? '';
  const appliedSubcategoryId = searchParams.get('subcategoryId') ?? '';
  const appliedYear = searchParams.get('year') ?? '';

  const [qInput, setQInput] = useState(appliedQ);
  const debouncedQ = useDebouncedValue(qInput.trim(), 350);
  const skipSearchUrlWrite = useRef(false);

  // Keep the search box aligned when navigation changes `q` (or clears it).
  useEffect(() => {
    skipSearchUrlWrite.current = true;
    setQInput(appliedQ);
  }, [appliedQ]);

  // Debounced search → URL (preserve category / subcategory / year).
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
    queryKey: publicCategoriesQueryKey('PRELIMINARY'),
    queryFn: () => fetchPublicCategories('PRELIMINARY'),
    staleTime: 60_000,
  });

  const yearsQ = useQuery({
    queryKey: ['public-question-set-years'],
    queryFn: listPublicQuestionSetYears,
    staleTime: 60_000,
  });

  /** Flat Preliminary subcategory list only (Written taxonomy never included). */
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
      'public-question-sets',
      appliedQ,
      appliedCategoryId,
      appliedSubcategoryId,
      appliedYear,
    ],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listPublicQuestionSets({
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
    // Only for the unfiltered list the server rendered; filtered URLs fetch as before.
    ...(initialSets && !(appliedQ || appliedCategoryId || appliedSubcategoryId || appliedYear)
      ? {
          initialData: { pages: [initialSets], pageParams: [undefined] },
          initialDataUpdatedAt: 0,
        }
      : {}),
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

      <GsapReveal className="rounded-[1.25rem] border border-[var(--line)] bg-white p-3 shadow-[var(--shadow-sm)] sm:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchField
              value={qInput}
              onChange={setQInput}
              placeholder="Search by title, category, or subcategory…"
              aria-label="Search collections by title, category, or subcategory"
              variant="pill"
              className="min-w-0 flex-1"
              onClear={() => {
                skipSearchUrlWrite.current = true;
                replaceFilters({
                  categoryId: appliedCategoryId || undefined,
                  subcategoryId: appliedSubcategoryId || undefined,
                  year: appliedYear || undefined,
                });
              }}
            />

            <div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:flex lg:w-auto lg:shrink-0 lg:flex-wrap lg:items-center">
              <label htmlFor="preli-subcategory" className="sr-only">
                Filter by subcategory
              </label>
              <Select
                id="preli-subcategory"
                value={appliedSubcategoryId}
                onChange={(e) => {
                  const subcategoryId = e.target.value;
                  replaceFilters({
                    q: appliedQ || undefined,
                    // Subcategory is more specific than a root category filter.
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
          message="Could not load collections. Please try again."
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
              : 'Published uploads will appear here.'
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
          {sets.map((set) => {
            const cardClass =
              'motion-hover-lift block w-full rounded-[1rem] border border-[var(--line)] bg-white px-5 py-4 text-left shadow-[var(--shadow-sm)] transition-all hover:border-[var(--highlight)] hover:shadow-[var(--shadow)]';
            return (
              <li key={set.id} data-gsap-stagger>
                {set.locked ? (
                  // DEC-060: locked sets stay visible; a click goes to Packages (or login).
                  <Link href={unlockHref} className={cn(cardClass, 'opacity-90')}>
                    <h2 className="font-display text-lg font-bold tracking-tight text-[var(--ink)] sm:text-xl">
                      {set.title}
                    </h2>
                    <LockedTag className="mt-1.5" />
                  </Link>
                ) : timedPractice ? (
                  <button
                    type="button"
                    className={cardClass}
                    onClick={() =>
                      setPracticeSet({
                        id: set.id,
                        title: set.title,
                        questionCount: set.questionCount,
                      })
                    }
                  >
                    <h2 className="font-display text-lg font-bold tracking-tight text-[var(--ink)] sm:text-xl">
                      {set.title}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--muted-strong)]">
                      <span className="tabular-nums font-semibold text-[var(--ink-soft)]">
                        {set.questionCount}
                      </span>{' '}
                      MCQ{set.questionCount === 1 ? '' : 's'} · Tap to set time & start
                    </p>
                  </button>
                ) : (
                  <Link href={`${bankRoot}/${set.id}`} className={cardClass}>
                    <h2 className="font-display text-lg font-bold tracking-tight text-[var(--ink)] sm:text-xl">
                      {set.title}
                    </h2>
                  </Link>
                )}
              </li>
            );
          })}
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

      {timedPractice ? (
        <PreliPracticeStartModal
          open={Boolean(practiceSet)}
          setTitle={practiceSet?.title ?? ''}
          questionCount={practiceSet?.questionCount ?? 0}
          pending={starting}
          onClose={() => {
            if (!starting) setPracticeSet(null);
          }}
          onStart={(durationMinutes) => {
            if (!practiceSet) return;
            setStarting(true);
            savePreliPracticeSession({
              setId: practiceSet.id,
              setTitle: practiceSet.title,
              durationMinutes,
              startedAtMs: Date.now(),
              answers: {},
            });
            router.push(`${bankRoot}/${encodeURIComponent(practiceSet.id)}/take`);
          }}
        />
      ) : null}
    </div>
  );
}
