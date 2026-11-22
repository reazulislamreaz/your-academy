'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Clock3, ListChecks } from 'lucide-react';
import {
  DEFAULT_MODEL_TEST_GUIDE_ITEMS,
  DEFAULT_MODEL_TEST_GUIDE_TITLE,
  type ModelTestGuideConfig,
} from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Label } from '@/components/ui/label';
import { SearchField } from '@/components/ui/search-field';
import { Select } from '@/components/ui/select';
import {
  getPublicModelTestGuide,
  listPublicModelTestCategories,
  listPublicModelTests,
  listPublicModelTestYears,
} from '@/lib/api/model-tests';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { cn } from '@/lib/utils';

const filterSelectClass =
  'h-10 min-h-10 border-[var(--line)] bg-[var(--bg-muted)] px-3.5 leading-normal shadow-none transition-[border-color,background-color,color] duration-150 hover:border-[var(--line-strong)] focus:border-[var(--accent)] focus:bg-[var(--bg-elevated)]';

const PAGE_SIZE = 12;

export function ModelTestListing() {
  const [q, setQ] = useState('');
  const [year, setYear] = useState('');
  const [categoryId, setCategoryId] = useState('');
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
  const items = list.data?.pages.flatMap((p) => p.data) ?? [];
  const guideConfig = resolveGuide(guide.data);

  return (
    <div className="marketing-container w-full overflow-x-clip py-7 sm:py-10">
      <header className="min-w-0">
        <h1 className="font-display text-[1.75rem] font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
          Model Test
        </h1>
      </header>

      <div className="mt-6 grid w-full gap-4 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_18.5rem]">
        <div className="min-w-0 space-y-4">
          <div
            className={cn(
              'rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)]',
              'p-3 shadow-[var(--shadow-sm)] sm:p-3.5',
            )}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <SearchField
                id="mt-search"
                value={q}
                onChange={setQ}
                placeholder="Search model tests…"
                aria-label="Search model tests"
                autoComplete="off"
                className="min-w-0 flex-1"
              />

              <div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:flex lg:w-auto lg:shrink-0 lg:flex-wrap lg:items-center">
                <Label htmlFor="mt-category" className="sr-only">
                  Filter by category
                </Label>
                <Select
                  id="mt-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={categories.isLoading}
                  className={cn(
                    filterSelectClass,
                    'w-full min-[420px]:min-w-0 lg:w-[15rem] lg:flex-none',
                    categoryId &&
                      'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]',
                  )}
                  aria-label="Filter by category"
                >
                  <option value="">All Categories</option>
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
                  className={cn(
                    filterSelectClass,
                    'w-full min-[420px]:min-w-0 lg:w-[11rem] lg:flex-none',
                    year && 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]',
                  )}
                  aria-label="Filter by year"
                >
                  <option value="">All Years</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          <aside className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-3.5 shadow-[var(--shadow-sm)] lg:hidden">
            <BanglaOverview guide={guideConfig} />
          </aside>

          {list.isLoading ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">Loading…</p>
          ) : items.length === 0 ? (
            <EmptyState align="center" title="No model tests found" />
          ) : (
            <>
              <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <li key={item.id}>
                    <article
                      className={cn(
                        'flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--line)]',
                        'bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-sm)] transition-colors',
                        'hover:border-[color-mix(in_srgb,var(--accent)_42%,var(--line))]',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/model-test/${item.slug}`}
                          className="min-w-0 font-display text-sm font-bold leading-snug tracking-tight break-words text-[var(--ink)] hover:text-[var(--accent)]"
                        >
                          {item.title}
                        </Link>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {item.category ? (
                            <span className="rounded-[var(--radius-sm)] bg-[var(--accent-soft)] px-1.5 py-0.5 text-[0.6rem] font-semibold text-[var(--accent)]">
                              {item.category.name}
                            </span>
                          ) : null}
                          {item.examYear ? (
                            <span className="rounded-[var(--radius-sm)] bg-[var(--bg-muted)] px-1.5 py-0.5 text-[0.6rem] font-semibold tabular-nums text-[var(--muted-strong)]">
                              {item.examYear}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[0.7rem] text-[var(--muted-strong)]">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="size-3 shrink-0" aria-hidden />
                          {item.durationInMinutes} min
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ListChecks className="size-3 shrink-0" aria-hidden />
                          {item.totalQuestions} Q
                        </span>
                      </div>
                      <div className="mt-auto pt-2.5">
                        <Link href={`/model-test/${item.slug}`} className="block">
                          <Button
                            size="sm"
                            className="min-h-11 w-full sm:min-h-9 sm:w-auto sm:px-3.5"
                          >
                            Start
                          </Button>
                        </Link>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>

              {list.hasNextPage ? (
                <div className="flex justify-center pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9"
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
    </div>
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
