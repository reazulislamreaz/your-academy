'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock3, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { listPublicModelTests, listPublicModelTestYears } from '@/lib/api/model-tests';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';

export function ModelTestListing() {
  const [q, setQ] = useState('');
  const [year, setYear] = useState<string>('');
  const debouncedQ = useDebouncedValue(q.trim(), 300);

  const years = useQuery({
    queryKey: ['public-model-test-years'],
    queryFn: listPublicModelTestYears,
  });

  const yearNum = year ? Number(year) : undefined;

  const list = useQuery({
    queryKey: ['public-model-tests', debouncedQ, yearNum ?? null],
    queryFn: () =>
      listPublicModelTests({
        q: debouncedQ || undefined,
        year: yearNum != null && Number.isFinite(yearNum) ? yearNum : undefined,
      }),
  });

  const yearOptions = useMemo(() => years.data ?? [], [years.data]);

  return (
    <div className="marketing-container overflow-x-clip px-3 py-8 sm:px-6 sm:py-14">
      <header className="mx-auto max-w-2xl px-1 text-center">
        <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-[var(--muted)] uppercase sm:text-[0.7rem]">
          Exams
        </p>
        <h1 className="mt-2 font-display text-[1.75rem] font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
          Model Test
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-pretty text-[var(--muted-strong)] sm:text-base">
          Full-length timed model tests — search by title, filter by year, then start.
        </p>
      </header>

      <div className="mx-auto mt-6 flex max-w-4xl flex-col gap-3 sm:mt-8 sm:flex-row sm:items-end">
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
          />
        </div>
        <div className="w-full sm:w-44">
          <Label htmlFor="mt-year" className="mb-1.5 block text-xs text-[var(--muted-strong)]">
            Year
          </Label>
          <select
            id="mt-year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="h-10 w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--ink)]"
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

      {list.isLoading ? (
        <p className="mt-10 text-center text-sm text-[var(--muted)]">Loading model tests…</p>
      ) : !list.data?.length ? (
        <div className="mx-auto mt-8 max-w-lg sm:mt-10">
          <EmptyState
            align="center"
            title="No model tests found"
            description="Try a different search or year filter, or check back after new uploads."
          />
        </div>
      ) : (
        <ul className="mx-auto mt-8 grid max-w-4xl gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-4">
          {list.data.map((item) => (
            <li
              key={item.id}
              className="flex flex-col rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)] sm:p-5"
            >
              <Link
                href={`/model-test/${item.slug}`}
                className="font-display text-base font-bold tracking-tight break-words text-[var(--ink)] transition-colors hover:text-[var(--accent)] sm:text-lg"
              >
                {item.title}
              </Link>
              {item.examYear ? (
                <p className="mt-1 text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">
                  {item.examYear}
                </p>
              ) : null}
              {item.description ? (
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--muted-strong)]">
                  {item.description}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[var(--muted-strong)]">
                <span className="inline-flex min-h-9 items-center gap-1.5">
                  <Clock3 className="size-4 shrink-0" aria-hidden />
                  {item.durationInMinutes} Mins
                </span>
                <span className="inline-flex min-h-9 items-center gap-1.5">
                  <ListChecks className="size-4 shrink-0" aria-hidden />
                  {item.totalQuestions} Questions
                </span>
              </div>
              <div className="mt-auto pt-5">
                <Link href={`/model-test/${item.slug}`} className="block sm:inline-block">
                  <Button className="h-11 w-full sm:h-10 sm:w-auto">Start Model Test</Button>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
