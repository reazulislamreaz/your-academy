'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Clock3, ListChecks } from 'lucide-react';
import type { PublicExamListItem, PublicModelTestListItem } from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Surface } from '@/components/ui/surface';
import { listPublicExams } from '@/lib/api/exams';
import { listPublicModelTests } from '@/lib/api/model-tests';
import { cn } from '@/lib/utils';

/** Max page size allowed by backend `parseLimit` (keeps dashboard synced with public lists). */
const PAGE_SIZE = 100;

type CatalogCardProps = {
  title: string;
  href: string;
  durationInMinutes: number;
  totalQuestions: number;
  meta?: string | null;
  kindLabel: string;
};

function CatalogCard({
  title,
  href,
  durationInMinutes,
  totalQuestions,
  meta,
  kindLabel,
}: CatalogCardProps) {
  return (
    <article
      className={cn(
        'motion-hover-lift flex h-full min-w-0 flex-col rounded-[var(--radius-lg)] border border-[var(--line)]',
        'bg-[var(--bg)] p-3.5 transition-shadow duration-300',
      )}
    >
      <p className="text-[0.65rem] font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
        {kindLabel}
      </p>
      <h3 className="mt-1 line-clamp-2 break-words font-display text-sm font-semibold tracking-tight text-[var(--ink)]">
        <Link href={href} className="hover:text-[var(--accent)]">
          {title}
        </Link>
      </h3>
      {meta ? <p className="mt-1 line-clamp-1 text-xs text-[var(--muted)]">{meta}</p> : null}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--muted-strong)]">
        <span className="inline-flex items-center gap-1">
          <Clock3 className="size-3.5 shrink-0" aria-hidden />
          {durationInMinutes} Mins
        </span>
        <span className="inline-flex items-center gap-1">
          <ListChecks className="size-3.5 shrink-0" aria-hidden />
          {totalQuestions} Q
        </span>
      </div>
      <div className="mt-auto pt-4">
        <Link href={href} className="block">
          <Button size="sm" className="h-10 w-full min-h-10">
            Start exam
          </Button>
        </Link>
      </div>
    </article>
  );
}

function ExamSection({
  kind,
  title,
  subtitle,
  viewAllHref,
  viewAllLabel,
  loading,
  error,
  empty,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onRetry,
  emptyTitle,
  emptyDescription,
  children,
}: {
  kind: 'model-test' | 'quiz';
  title: string;
  subtitle: string;
  viewAllHref: string;
  viewAllLabel: string;
  loading: boolean;
  error: boolean;
  empty: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  emptyTitle: string;
  emptyDescription: string;
  children: ReactNode;
}) {
  return (
    <Surface elevated className="space-y-4 overflow-x-clip p-3.5 sm:p-5" data-exam-catalog={kind}>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold tracking-tight text-[var(--ink)] sm:text-lg">
            {title}
          </h2>
          <p className="mt-0.5 text-pretty text-sm text-[var(--muted)]">{subtitle}</p>
        </div>
        <Link
          href={viewAllHref}
          className="shrink-0 self-start text-xs font-semibold text-[var(--accent)] underline-offset-2 hover:underline sm:self-auto"
        >
          {viewAllLabel}
        </Link>
      </div>

      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}

      {error ? (
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-muted)]/40 px-3 py-4 text-sm text-[var(--muted-strong)]">
          Could not load this list.{' '}
          <button
            type="button"
            className="font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      ) : null}

      {!loading && !error && empty ? (
        <EmptyState
          nested
          className="py-8"
          title={emptyTitle}
          description={emptyDescription}
          action={
            <Link href={viewAllHref}>
              <Button size="sm" variant="soft">
                Open listing
              </Button>
            </Link>
          }
        />
      ) : null}

      {!loading && !error && !empty ? (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</ul>
          {hasNextPage ? (
            <div className="flex justify-center pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-10"
                disabled={isFetchingNextPage}
                onClick={onLoadMore}
              >
                {isFetchingNextPage ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </Surface>
  );
}

/**
 * Learner dashboard catalog of all published guest Model Tests + Quizzes.
 * Uses the same public list APIs and take routes as the marketing homepage.
 */
export function AvailableExamsCatalog() {
  const modelTests = useInfiniteQuery({
    queryKey: ['public-model-tests', 'dashboard-all'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listPublicModelTests({
        cursor: pageParam,
        limit: PAGE_SIZE,
      }),
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
    staleTime: 30_000,
  });

  const quizzes = useInfiniteQuery({
    queryKey: ['public-exams', 'dashboard-all'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listPublicExams({
        cursor: pageParam,
        limit: PAGE_SIZE,
      }),
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
    staleTime: 30_000,
  });

  const modelItems: PublicModelTestListItem[] =
    modelTests.data?.pages.flatMap((p) => p.data) ?? [];
  const quizItems: PublicExamListItem[] = quizzes.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="flex flex-col gap-4 sm:gap-5" id="available-exams">
      <ExamSection
        kind="quiz"
        title="Quizzes"
        subtitle="All published live quizzes — same exam system as the homepage"
        viewAllHref="/live-quizzes"
        viewAllLabel="Browse all"
        loading={quizzes.isLoading}
        error={quizzes.isError}
        empty={quizItems.length === 0}
        hasNextPage={Boolean(quizzes.hasNextPage)}
        isFetchingNextPage={quizzes.isFetchingNextPage}
        onLoadMore={() => void quizzes.fetchNextPage()}
        onRetry={() => void quizzes.refetch()}
        emptyTitle="No quizzes yet"
        emptyDescription="New quizzes appear here automatically when an admin publishes them."
      >
        {quizItems.map((item) => (
          <li key={item.id} className="min-w-0">
            <CatalogCard
              kindLabel="Quiz"
              title={item.title}
              href={`/live-quizzes/${item.slug}`}
              durationInMinutes={item.durationInMinutes}
              totalQuestions={item.totalQuestions}
            />
          </li>
        ))}
      </ExamSection>

      <ExamSection
        kind="model-test"
        title="Model tests"
        subtitle="All published model tests — same timed exams as the homepage"
        viewAllHref="/live-model-tests"
        viewAllLabel="Browse all"
        loading={modelTests.isLoading}
        error={modelTests.isError}
        empty={modelItems.length === 0}
        hasNextPage={Boolean(modelTests.hasNextPage)}
        isFetchingNextPage={modelTests.isFetchingNextPage}
        onLoadMore={() => void modelTests.fetchNextPage()}
        onRetry={() => void modelTests.refetch()}
        emptyTitle="No model tests yet"
        emptyDescription="New model tests appear here automatically when an admin publishes them."
      >
        {modelItems.map((item) => (
          <li key={item.id} className="min-w-0">
            <CatalogCard
              kindLabel="Model test"
              title={item.title}
              href={`/live-model-tests/${item.slug}`}
              durationInMinutes={item.durationInMinutes}
              totalQuestions={item.totalQuestions}
              meta={
                [item.examYear != null ? String(item.examYear) : null, item.category?.name]
                  .filter(Boolean)
                  .join(' · ') || null
              }
            />
          </li>
        ))}
      </ExamSection>
    </div>
  );
}
