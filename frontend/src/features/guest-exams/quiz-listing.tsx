'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Clock3, ListChecks } from 'lucide-react';
import {
  DEFAULT_EXAM_GUIDE_ITEMS,
  DEFAULT_EXAM_GUIDE_TITLE,
  type ExamGuideConfig,
} from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchField } from '@/components/ui/search-field';
import { getPublicExamGuide, listPublicExams } from '@/lib/api/exams';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 12;

export function QuizListing() {
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q.trim(), 300);

  const guide = useQuery({
    queryKey: ['public-exam-guide'],
    queryFn: getPublicExamGuide,
    staleTime: 60_000,
  });

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
  const guideConfig = resolveGuide(guide.data);

  return (
    <div className="marketing-container w-full overflow-x-clip py-7 sm:py-10">
      <header className="min-w-0">
        <h1 className="font-display text-[1.75rem] font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
          Quiz
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
            <SearchField
              id="quiz-search"
              value={q}
              onChange={setQ}
              placeholder="Search quizzes…"
              aria-label="Search quizzes"
              autoComplete="off"
              className="w-full"
            />
          </div>

          <aside className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-3.5 shadow-[var(--shadow-sm)] lg:hidden">
            <QuizOverview guide={guideConfig} />
          </aside>

          {list.isLoading ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">Loading…</p>
          ) : items.length === 0 ? (
            <EmptyState align="center" title="No quizzes found" />
          ) : (
            <>
              <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((exam) => (
                  <li key={exam.id}>
                    <article
                      className={cn(
                        'flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--line)]',
                        'bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-sm)] transition-colors',
                        'hover:border-[color-mix(in_srgb,var(--accent)_42%,var(--line))]',
                      )}
                    >
                      <Link
                        href={`/exams/${exam.slug}`}
                        className="min-w-0 font-display text-sm font-bold leading-snug tracking-tight break-words text-[var(--ink)] hover:text-[var(--accent)]"
                      >
                        {exam.title}
                      </Link>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[0.7rem] text-[var(--muted-strong)]">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="size-3 shrink-0" aria-hidden />
                          {exam.durationInMinutes} min
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ListChecks className="size-3 shrink-0" aria-hidden />
                          {exam.totalQuestions} Q
                        </span>
                      </div>
                      <div className="mt-auto pt-2.5">
                        <Link href={`/exams/${exam.slug}`} className="block">
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
            <QuizOverview guide={guideConfig} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function resolveGuide(data: ExamGuideConfig | undefined): ExamGuideConfig {
  if (!data) {
    return {
      title: DEFAULT_EXAM_GUIDE_TITLE,
      items: DEFAULT_EXAM_GUIDE_ITEMS.map((item) => ({ ...item })),
      updatedAt: null,
    };
  }
  return {
    title: data.title.trim() || DEFAULT_EXAM_GUIDE_TITLE,
    items: Array.isArray(data.items) ? data.items : [],
    updatedAt: data.updatedAt,
  };
}

function QuizOverview({ guide }: { guide: ExamGuideConfig }) {
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
