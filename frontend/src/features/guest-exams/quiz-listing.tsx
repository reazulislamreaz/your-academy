'use client';

import { useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  DEFAULT_EXAM_GUIDE_ITEMS,
  DEFAULT_EXAM_GUIDE_TITLE,
  type ExamGuideConfig,
} from '@your-academy/shared';
import { GsapEntrance } from '@/components/motion/gsap-entrance';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ExamCard, ExamCardGridSkeleton } from '@/features/exam-ui/exam-card';
import { ExamListToolbar, sortExams, type ExamSort } from '@/features/exam-ui/exam-list-toolbar';
import { useTimedExamStatus } from '@/features/exam-ui/use-exam-status';
import { getPublicExamGuide, listPublicExams } from '@/lib/api/exams';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 12;

type Props = {
  /** Start-link prefix. Marketing `/exams`; learner `/live-quizzes`. */
  basePath?: string;
  /** Hide marketing page chrome when nested under learner `PageHeader`. */
  embedded?: boolean;
};

export function QuizListing({ basePath = '/exams', embedded = false }: Props) {
  const takeBase = basePath.replace(/\/$/, '') || '/exams';
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<ExamSort>('newest');
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

  const items = useMemo(() => list.data?.pages.flatMap((p) => p.data) ?? [], [list.data]);
  const sorted = useMemo(
    () =>
      sortExams(items, sort, (exam) => ({
        title: exam.title,
        createdAt: exam.createdAt,
        durationMinutes: exam.durationInMinutes,
        questionCount: exam.totalQuestions,
      })),
    [items, sort],
  );
  const statusOf = useTimedExamStatus(
    'exam',
    items.map((exam) => exam.id),
  );
  const guideConfig = resolveGuide(guide.data);

  return (
    <GsapEntrance
      y={10}
      duration={0.36}
      className={cn('w-full overflow-x-clip', embedded ? '' : 'marketing-container py-7 sm:py-10')}
    >
      {embedded ? null : (
        <header className="min-w-0">
          <h1 className="font-display text-[1.75rem] font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
            Quiz
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
            idPrefix="quiz"
            search={q}
            onSearch={setQ}
            searchPlaceholder="Search quizzes…"
            sort={sort}
            onSort={setSort}
            summary={
              list.isSuccess && items.length > 0 ? (
                <>
                  Showing {items.length} quiz{items.length === 1 ? '' : 'zes'}
                  {list.hasNextPage && sort !== 'newest' ? ' · sorted within loaded results' : ''}
                </>
              ) : null
            }
          />

          <aside className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-3.5 shadow-[var(--shadow-sm)] lg:hidden">
            <QuizOverview guide={guideConfig} />
          </aside>

          {list.isLoading ? (
            <ExamCardGridSkeleton count={6} />
          ) : list.isError ? (
            <Alert variant="danger">Could not load quizzes. Please try again shortly.</Alert>
          ) : items.length === 0 ? (
            <EmptyState
              align="center"
              title={debouncedQ ? 'No quizzes match your search' : 'No quizzes yet'}
              description={
                debouncedQ
                  ? 'Try a different keyword or clear the search.'
                  : 'New quizzes will appear here as soon as they are published.'
              }
              action={
                debouncedQ ? (
                  <Button type="button" variant="outline" onClick={() => setQ('')}>
                    Clear search
                  </Button>
                ) : null
              }
            />
          ) : (
            <>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {sorted.map((exam) => (
                  <li key={exam.id}>
                    <ExamCard
                      href={`${takeBase}/${exam.slug}`}
                      title={exam.title}
                      kindLabel="Quiz"
                      questionCount={exam.totalQuestions}
                      durationMinutes={exam.durationInMinutes}
                      status={statusOf(exam)}
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
            <QuizOverview guide={guideConfig} />
          </div>
        </aside>
      </div>
    </GsapEntrance>
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
