'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Clock3, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  listPublicModelTestCategories,
  listPublicModelTests,
  listPublicModelTestYears,
} from '@/lib/api/model-tests';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 12;

const OVERVIEW_STEPS = [
  'খুঁজুন / ফিল্টার করে একটি মডেল টেস্ট বেছে নিন।',
  'নাম দিয়ে শুরু — টাইমার চলবে।',
  'এক পৃষ্ঠায় ক–ঘ উত্তর মার্ক করুন।',
  'স্কিপ থাকলে সাবমিটের আগে নিশ্চিতকরণ আসবে।',
  'ফলাফলে স্কোর ও সঠিক/ভুল দেখুন।',
] as const;

export function ModelTestListing() {
  const [q, setQ] = useState('');
  const [year, setYear] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const debouncedQ = useDebouncedValue(q.trim(), 300);
  const yearNum = year ? Number(year) : undefined;
  const yearFilter =
    yearNum != null && Number.isFinite(yearNum) ? yearNum : undefined;

  const years = useQuery({
    queryKey: ['public-model-test-years'],
    queryFn: listPublicModelTestYears,
  });

  const categories = useQuery({
    queryKey: ['public-model-test-categories'],
    queryFn: listPublicModelTestCategories,
  });

  const list = useInfiniteQuery({
    queryKey: [
      'public-model-tests',
      debouncedQ,
      yearFilter ?? null,
      categoryId || null,
    ],
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

  return (
    <div className="marketing-container overflow-x-clip px-3 py-7 sm:px-6 sm:py-10">
      <header className="mx-auto max-w-3xl px-1 text-center">
        <h1 className="font-display text-[1.75rem] font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
          Model Test
        </h1>
      </header>

      <div className="mx-auto mt-6 grid max-w-6xl gap-4 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_16.5rem] lg:items-start lg:gap-5">
        <div className="min-w-0 space-y-3.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Label htmlFor="mt-search" className="sr-only">
                Search
              </Label>
              <Input
                id="mt-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                autoComplete="off"
                className="h-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
              <div className="min-w-0 sm:w-40">
                <Label htmlFor="mt-category" className="sr-only">
                  Category
                </Label>
                <select
                  id="mt-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="h-9 w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] px-2 text-sm text-[var(--ink)]"
                >
                  <option value="">All categories</option>
                  {categoryOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0 sm:w-28">
                <Label htmlFor="mt-year" className="sr-only">
                  Year
                </Label>
                <select
                  id="mt-year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="h-9 w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] px-2 text-sm text-[var(--ink)]"
                >
                  <option value="">Year</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <aside className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-3 lg:hidden">
            <BanglaOverview />
          </aside>

          {list.isLoading ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">Loading…</p>
          ) : items.length === 0 ? (
            <EmptyState align="center" title="No model tests found" />
          ) : (
            <>
              <ul className="grid gap-2 sm:grid-cols-2">
                {items.map((item) => (
                  <li key={item.id}>
                    <article
                      className={cn(
                        'flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--line)]',
                        'bg-[var(--bg-elevated)] p-2.5 shadow-[var(--shadow-sm)] transition-colors',
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
                            <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[0.6rem] font-semibold text-[var(--accent)]">
                              {item.category.name}
                            </span>
                          ) : null}
                          {item.examYear ? (
                            <span className="rounded bg-[var(--bg-muted)] px-1.5 py-0.5 text-[0.6rem] font-semibold tabular-nums text-[var(--muted-strong)]">
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
                      <div className="mt-auto pt-2">
                        <Link href={`/model-test/${item.slug}`} className="block">
                          <Button size="sm" className="h-7 w-full text-[0.7rem] sm:w-auto sm:px-3">
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
                    className="h-8 text-xs"
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

        <aside className="hidden lg:sticky lg:top-[calc(var(--header-h,4.5rem)+0.75rem)] lg:block">
          <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-3.5 shadow-[var(--shadow-sm)]">
            <BanglaOverview />
          </div>
        </aside>
      </div>
    </div>
  );
}

function BanglaOverview() {
  return (
    <div className="space-y-2">
      <h2 className="font-display text-[0.9375rem] font-bold tracking-tight text-[var(--ink)]">
        মডেল টেস্ট কীভাবে দিবেন
      </h2>
      <ol className="space-y-1.5 text-[0.75rem] leading-relaxed text-[var(--muted-strong)]">
        {OVERVIEW_STEPS.map((step, i) => (
          <li key={i} className="flex gap-1.5">
            <span
              className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[0.6rem] font-bold text-[var(--accent)]"
              aria-hidden
            >
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
