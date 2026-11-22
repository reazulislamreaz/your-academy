'use client';

import Link from 'next/link';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { ListCardSkeleton, LoadError } from '@/components/loading';
import { GoForExamCta } from '@/components/marketing/go-for-exam-cta';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PublicWrittenCard } from '@/components/marketing/public-written-card';
import {
  getPublicWrittenQuestionSet,
  listPublicWrittenSetQuestions,
} from '@/lib/api/written-questions';
import { ExamInfoCard } from './exam-info-card';
import { cn } from '@/lib/utils';

type Props = {
  setId: string;
  className?: string;
  /** Listing root for back navigation. Marketing default; learner uses `/written`. */
  basePath?: string;
  /** Hide homepage marketing CTAs when nested in the learner shell. */
  embedded?: boolean;
};

export function WrittenQuestionSetView({
  setId,
  className,
  basePath = '/written-question-bank',
  embedded = false,
}: Props) {
  const bankRoot = basePath.replace(/\/$/, '') || '/written-question-bank';
  const setQry = useQuery({
    queryKey: ['public-written-question-set', setId],
    queryFn: () => getPublicWrittenQuestionSet(setId),
  });

  const list = useInfiniteQuery({
    queryKey: ['public-written-set-questions', setId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listPublicWrittenSetQuestions(setId, {
        cursor: pageParam,
        limit: 20,
      }),
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
  });

  const items = list.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={bankRoot}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted-strong)] hover:text-[var(--highlight)]"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All written sets
        </Link>
      </div>

      {embedded ? null : <GoForExamCta compact />}

      {setQry.isLoading ? (
        <div className="space-y-3 rounded-[1rem] border border-[var(--line)] bg-[var(--bg-elevated)] px-5 py-5 shadow-[var(--shadow-sm)]">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-2/3 max-w-lg" />
        </div>
      ) : null}
      {setQry.isError ? (
        <LoadError message="Written question set not found or has no published questions." />
      ) : null}
      {setQry.data ? (
        <header className="space-y-3 border-b border-[var(--line)] pb-5">
          <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
            Written set
          </p>
          <h1 className="font-display text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-tight text-[var(--ink)]">
            {setQry.data.title}
          </h1>
          {setQry.data.sheetPreamble ? (
            <ExamInfoCard preamble={setQry.data.sheetPreamble} />
          ) : null}
        </header>
      ) : null}

      {list.isLoading ? (
        <ListCardSkeleton rows={3} rowClassName="min-h-32 py-6" />
      ) : null}

      {list.isError ? (
        <LoadError
          message="Could not load questions for this set."
          onRetry={() => void list.refetch()}
        />
      ) : null}

      {!list.isLoading && !list.isError && items.length === 0 ? (
        <EmptyState
          align="center"
          title="No questions yet"
          description="This written set has no published questions."
        />
      ) : null}

      <ul className="space-y-4">
        {items.map((item, index) => {
          const prevSection = index > 0 ? items[index - 1]?.sectionTitle : null;
          const showSection =
            Boolean(item.sectionTitle) && item.sectionTitle !== prevSection;
          return (
            <li key={item.id} className="space-y-3">
              {showSection ? (
                <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-muted)] px-4 py-2.5">
                  <p className="font-display text-sm font-bold tracking-tight text-[var(--ink)]">
                    {item.sectionTitle}
                  </p>
                </div>
              ) : null}
              <PublicWrittenCard question={item} />
            </li>
          );
        })}
      </ul>

      {list.hasNextPage ? (
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={list.isFetchingNextPage}
            onClick={() => void list.fetchNextPage()}
          >
            {list.isFetchingNextPage ? 'Loading…' : 'Load more questions'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
