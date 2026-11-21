'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Clock3, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { listPublicExams } from '@/lib/api/exams';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 12;

export function QuizListing() {
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q.trim(), 300);

  const list = useInfiniteQuery({
    queryKey: ['public-exams', debouncedQ],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listPublicExams({
        q: debouncedQ || undefined,
        cursor: pageParam,
        limit: PAGE_SIZE,
      }),
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
  });

  const items = list.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="marketing-container overflow-x-clip px-3 py-8 sm:px-6 sm:py-12">
      <header className="mx-auto max-w-2xl px-1 text-center">
        <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-[var(--muted)] uppercase sm:text-[0.7rem]">
          Live exams
        </p>
        <h1 className="mt-2 font-display text-[1.75rem] font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
          Quiz
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-pretty text-[var(--muted-strong)] sm:text-[0.9375rem]">
          Timed practice quizzes — enter your name, beat the clock, and review your answer sheet.
        </p>
      </header>

      <div className="mx-auto mt-6 max-w-4xl sm:mt-8">
        <Label htmlFor="quiz-search" className="sr-only">
          Search quizzes
        </Label>
        <Input
          id="quiz-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title…"
          autoComplete="off"
          className="h-10"
        />
      </div>

      {list.isLoading ? (
        <p className="mt-10 text-center text-sm text-[var(--muted)]">Loading quizzes…</p>
      ) : items.length === 0 ? (
        <div className="mx-auto mt-8 max-w-lg sm:mt-10">
          <EmptyState
            align="center"
            title="No quizzes found"
            description="Try a different search, or check back after new quizzes are published."
          />
        </div>
      ) : (
        <>
          <ul className="mx-auto mt-6 grid max-w-4xl gap-2 sm:mt-8 sm:grid-cols-2">
            {items.map((exam) => (
              <li key={exam.id}>
                <article
                  className={cn(
                    'flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--line)]',
                    'bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-sm)] transition-[border-color]',
                    'hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--line))]',
                  )}
                >
                  <h2 className="font-display text-sm font-bold leading-snug tracking-tight break-words text-[var(--ink)] sm:text-[0.9375rem]">
                    {exam.title}
                  </h2>
                  {exam.description ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--muted-strong)]">
                      {exam.description}
                    </p>
                  ) : null}
                  <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--muted-strong)]">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="size-3.5 shrink-0" aria-hidden />
                      {exam.durationInMinutes} min
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ListChecks className="size-3.5 shrink-0" aria-hidden />
                      {exam.totalQuestions} Q
                    </span>
                  </div>
                  <div className="mt-auto pt-2.5">
                    <Link href={`/exams/${exam.slug}`} className="block">
                      <Button size="sm" className="h-8 w-full text-xs sm:w-auto sm:px-3.5">
                        Start Quiz
                      </Button>
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>

          {list.hasNextPage ? (
            <div className="mt-5 flex justify-center">
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
  );
}
