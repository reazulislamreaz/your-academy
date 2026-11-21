'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Clock3, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { listPublicModelTests, listPublicModelTestYears } from '@/lib/api/model-tests';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 12;

const OVERVIEW_STEPS = [
  'শিরোনাম দিয়ে খুঁজুন বা বছর ফিল্টার করে একটি মডেল টেস্ট বেছে নিন।',
  'নাম লিখে শুরু করুন — নির্ধারিত সময়ের টাইমার চলতে থাকবে।',
  'সব প্রশ্ন এক পৃষ্ঠায় থাকবে; ক, খ, গ, ঘ থেকে উত্তর মার্ক করুন।',
  'সাবমিটের আগে উত্তর না থাকলে নিশ্চিতকরণ পপআপ আসবে — ফিরে গিয়ে শেষ করতে পারবেন।',
  'ফলাফলে স্কোর, সঠিক/ভুল/স্কিপ করা উত্তর এবং পূর্ণ রিভিউ দেখুন।',
] as const;

export function ModelTestListing() {
  const [q, setQ] = useState('');
  const [year, setYear] = useState<string>('');
  const debouncedQ = useDebouncedValue(q.trim(), 300);
  const yearNum = year ? Number(year) : undefined;
  const yearFilter =
    yearNum != null && Number.isFinite(yearNum) ? yearNum : undefined;

  const years = useQuery({
    queryKey: ['public-model-test-years'],
    queryFn: listPublicModelTestYears,
  });

  const list = useInfiniteQuery({
    queryKey: ['public-model-tests', debouncedQ, yearFilter ?? null],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listPublicModelTests({
        q: debouncedQ || undefined,
        year: yearFilter,
        cursor: pageParam,
        limit: PAGE_SIZE,
      }),
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
  });

  const yearOptions = useMemo(() => years.data ?? [], [years.data]);
  const items = list.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="marketing-container overflow-x-clip px-3 py-8 sm:px-6 sm:py-12">
      <header className="mx-auto max-w-3xl px-1 text-center">
        <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-[var(--muted)] uppercase sm:text-[0.7rem]">
          Exams
        </p>
        <h1 className="mt-2 font-display text-[1.75rem] font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
          Model Test
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-pretty text-[var(--muted-strong)] sm:text-[0.9375rem]">
          Timed full-length tests — search, filter by year, then start.
        </p>
      </header>

      <div className="mx-auto mt-7 grid max-w-6xl gap-5 lg:mt-9 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start lg:gap-6">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Label htmlFor="mt-search" className="sr-only">
                Search model tests
              </Label>
              <Input
                id="mt-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by title…"
                autoComplete="off"
                className="h-10"
              />
            </div>
            <div className="w-full sm:w-36">
              <Label
                htmlFor="mt-year"
                className="mb-1 block text-[0.7rem] font-medium text-[var(--muted-strong)]"
              >
                Year
              </Label>
              <select
                id="mt-year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="h-10 w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] px-2.5 text-sm text-[var(--ink)]"
              >
                <option value="">All years</option>
                {yearOptions.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bangla overview — mobile/tablet (above list) */}
          <aside className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-3.5 shadow-[var(--shadow-sm)] lg:hidden">
            <BanglaOverview />
          </aside>

          {list.isLoading ? (
            <p className="py-10 text-center text-sm text-[var(--muted)]">Loading model tests…</p>
          ) : items.length === 0 ? (
            <EmptyState
              align="center"
              title="No model tests found"
              description="Try a different search or year filter, or check back after new uploads."
            />
          ) : (
            <>
              <ul className="grid gap-2 sm:grid-cols-2">
                {items.map((item) => (
                  <li key={item.id}>
                    <article
                      className={cn(
                        'flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--line)]',
                        'bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-sm)] transition-[border-color,box-shadow]',
                        'hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--line))]',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/model-test/${item.slug}`}
                          className="min-w-0 font-display text-sm font-bold leading-snug tracking-tight break-words text-[var(--ink)] transition-colors hover:text-[var(--accent)] sm:text-[0.9375rem]"
                        >
                          {item.title}
                        </Link>
                        {item.examYear ? (
                          <span className="shrink-0 rounded bg-[var(--bg-muted)] px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums text-[var(--muted-strong)]">
                            {item.examYear}
                          </span>
                        ) : null}
                      </div>
                      {item.description ? (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--muted-strong)]">
                          {item.description}
                        </p>
                      ) : null}
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted-strong)]">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="size-3.5 shrink-0" aria-hidden />
                          {item.durationInMinutes} min
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ListChecks className="size-3.5 shrink-0" aria-hidden />
                          {item.totalQuestions} Q
                        </span>
                      </div>
                      <div className="mt-auto pt-2.5">
                        <Link href={`/model-test/${item.slug}`} className="block">
                          <Button size="sm" className="h-8 w-full text-xs sm:w-auto sm:px-3.5">
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

        {/* Bangla overview — desktop sticky side panel */}
        <aside className="hidden lg:sticky lg:top-[calc(var(--header-h,4.5rem)+0.75rem)] lg:block">
          <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)]">
            <BanglaOverview />
          </div>
        </aside>
      </div>
    </div>
  );
}

function BanglaOverview() {
  return (
    <div className="space-y-2.5">
      <p className="text-[0.65rem] font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
        Overview
      </p>
      <h2 className="font-display text-base font-bold tracking-tight text-[var(--ink)]">
        মডেল টেস্ট কীভাবে দিবেন
      </h2>
      <ol className="space-y-2 text-[0.8125rem] leading-relaxed text-[var(--muted-strong)]">
        {OVERVIEW_STEPS.map((step, i) => (
          <li key={i} className="flex gap-2">
            <span
              className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[0.65rem] font-bold text-[var(--accent)]"
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
