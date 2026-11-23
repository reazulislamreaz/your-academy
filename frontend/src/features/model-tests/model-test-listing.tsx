'use client';

import { useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  DEFAULT_MODEL_TEST_GUIDE_ITEMS,
  DEFAULT_MODEL_TEST_GUIDE_TITLE,
  type ModelTestGuideConfig,
} from '@your-academy/shared';
import { GsapEntrance } from '@/components/motion/gsap-entrance';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { ExamCard, ExamCardGridSkeleton } from '@/features/exam-ui/exam-card';
import {
  ExamListToolbar,
  filterSelectClass,
  sortExams,
  type ExamSort,
} from '@/features/exam-ui/exam-list-toolbar';
import { useTimedExamStatus } from '@/features/exam-ui/use-exam-status';
import {
  getPublicModelTestGuide,
  listPublicModelTestCategories,
  listPublicModelTests,
  listPublicModelTestYears,
} from '@/lib/api/model-tests';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 12;

const activeFilterClass = 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]';

type Props = {
  /** Start-link prefix. Marketing `/model-test`; learner `/live-model-tests`. */
  basePath?: string;
  /** Hide marketing page chrome when nested under learner `PageHeader`. */
  embedded?: boolean;
};

export function ModelTestListing({ basePath = '/model-test', embedded = false }: Props) {
  const takeBase = basePath.replace(/\/$/, '') || '/model-test';
  const [q, setQ] = useState('');
  const [year, setYear] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sort, setSort] = useState<ExamSort>('newest');
  const debouncedQ = useDebouncedValue(q.trim(), 300);
  const yearNum = year ? Number(year) : undefined;
  const yearFilter = yearNum != null && Number.isFinite(yearNum) ? yearNum : undefined;

  const years = useQuery({
    queryKey: ['public-model-test-years'],
    queryFn: listPublicModelTestYears,
  });

  const categories = useQuery({
    queryKey: ['public-model-test-categories'],
    queryFn: listPublicModelTestCategories,
  });

  const guide = useQuery({
    queryKey: ['public-model-test-guide'],
    queryFn: getPublicModelTestGuide,
    staleTime: 60_000,
  });

  const list = useInfiniteQuery({
    queryKey: ['public-model-tests', debouncedQ, yearFilter ?? null, categoryId || null],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listPublicModelTests({
        q: debouncedQ || undefined,
        year: yearFilter,
        categoryId: categoryId || undefined,
        cursor: pageParam,
        limit: PAGE_SIZE,
      }),
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
  });

  const yearOptions = useMemo(() => years.data ?? [], [years.data]);
  const categoryOptions = useMemo(() => categories.data ?? [], [categories.data]);
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.data) ?? [], [list.data]);
  const sorted = useMemo(
    () =>
      sortExams(items, sort, (item) => ({
        title: item.title,
        createdAt: item.createdAt,
        durationMinutes: item.durationInMinutes,
        questionCount: item.totalQuestions,
      })),
    [items, sort],
  );
  const statusOf = useTimedExamStatus(
    'model-test',
    items.map((item) => item.id),
  );
  const guideConfig = resolveGuide(guide.data);
  const filtered = Boolean(debouncedQ || yearFilter != null || categoryId);
  const clearFilters = () => {
    setQ('');
    setYear('');
    setCategoryId('');
  };

  return (
    <GsapEntrance
      y={10}
      duration={0.36}
      className={cn('w-full overflow-x-clip', embedded ? '' : 'marketing-container py-7 sm:py-10')}
    >
      {embedded ? null : (
        <header className="min-w-0">
          <h1 className="font-display text-[1.75rem] font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
            Model Test
          </h1>
        </header>
      )}

      <div
        className={cn(
          'grid w-full gap-4 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_18.5rem]',
          embedded ? 'mt-0' : 'mt-6 lg:mt-8',
        )}
      >
        <div className="min-w-0 space-y-4">
          <ExamListToolbar
            idPrefix="mt"
            search={q}
            onSearch={setQ}
            searchPlaceholder="Search model tests…"
            sort={sort}
            onSort={setSort}
            filters={
              <>
                <Label htmlFor="mt-category" className="sr-only">
                  Filter by category
                </Label>
                <Select
                  id="mt-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={categories.isLoading}
                  className={cn(filterSelectClass, 'lg:w-[13rem]', categoryId && activeFilterClass)}
                >
                  <option value="">All categories</option>
                  {categoryOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>

                <Label htmlFor="mt-year" className="sr-only">
                  Filter by year
                </Label>
                <Select
                  id="mt-year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  disabled={years.isLoading}
                  className={cn(filterSelectClass, 'lg:w-[9rem]', year && activeFilterClass)}
                >
                  <option value="">All years</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </Select>
              </>
            }
            summary={
              list.isSuccess && items.length > 0 ? (
                <>
                  Showing {items.length} model test{items.length === 1 ? '' : 's'}
                  {list.hasNextPage && sort !== 'newest' ? ' · sorted within loaded results' : ''}
                  {filtered ? (
                    <>
                      {' · '}
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="cursor-pointer font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
                      >
                        Clear filters
                      </button>
                    </>
                  ) : null}
                </>
              ) : null
            }
          />

          <aside className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-3.5 shadow-[var(--shadow-sm)] lg:hidden">
            <BanglaOverview guide={guideConfig} />
          </aside>

          {list.isLoading ? (
            <ExamCardGridSkeleton count={6} />
          ) : list.isError ? (
            <Alert variant="danger">Could not load model tests. Please try again shortly.</Alert>
          ) : items.length === 0 ? (
            <EmptyState
              align="center"
              title={filtered ? 'No model tests match these filters' : 'No model tests yet'}
              description={
                filtered
                  ? 'Try another keyword, category or year.'
                  : 'New model tests will appear here as soon as they are published.'
              }
              action={
                filtered ? (
                  <Button type="button" variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : null
              }
            />
          ) : (
            <>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {sorted.map((item) => (
                  <li key={item.id}>
                    <ExamCard
                      href={`${takeBase}/${item.slug}`}
                      title={item.title}
                      kindLabel="Model test"
                      tags={[
                        item.category?.name,
                        item.examYear != null ? String(item.examYear) : null,
                      ].filter((t): t is string => Boolean(t))}
                      questionCount={item.totalQuestions}
                      durationMinutes={item.durationInMinutes}
                      status={statusOf(item)}
                    />
                  </li>
                ))}
              </ul>

              {list.hasNextPage ? (
                <div className="flex justify-center pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={list.isFetchingNextPage}
                    onClick={() => void list.fetchNextPage()}
                  >
                    {list.isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>

        <aside className="hidden min-w-0 lg:sticky lg:top-[calc(var(--header-h,4.5rem)+0.75rem)] lg:block">
          <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-3.5 shadow-[var(--shadow-sm)]">
            <BanglaOverview guide={guideConfig} />
          </div>
        </aside>
      </div>
    </GsapEntrance>
  );
}

function resolveGuide(data: ModelTestGuideConfig | undefined): ModelTestGuideConfig {
  if (!data) {
    return {
      title: DEFAULT_MODEL_TEST_GUIDE_TITLE,
      items: DEFAULT_MODEL_TEST_GUIDE_ITEMS.map((item) => ({ ...item })),
      updatedAt: null,
    };
  }
  return {
    title: data.title.trim() || DEFAULT_MODEL_TEST_GUIDE_TITLE,
    // Saved admin config wins — including an intentionally empty steps list.
    items: Array.isArray(data.items) ? data.items : [],
    updatedAt: data.updatedAt,
  };
}

function BanglaOverview({ guide }: { guide: ModelTestGuideConfig }) {
  const steps = guide.items.filter((item) => item.text.trim().length > 0);

  return (
    <div className="space-y-2">
      <h2 className="font-display text-[0.9375rem] font-bold tracking-tight text-[var(--ink)]">
        {guide.title}
      </h2>
      {steps.length === 0 ? null : (
        <ol className="space-y-1.5 text-[0.75rem] leading-relaxed text-[var(--muted-strong)]">
          {steps.map((step, i) => (
            <li key={step.id || `step-${i}`} className="flex gap-1.5">
              <span
                className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[0.6rem] font-bold text-[var(--accent)]"
                aria-hidden
              >
                {i + 1}
              </span>
              <span>{step.text}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
