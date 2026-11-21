'use client';

import Link from 'next/link';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { ListCardSkeleton, LoadError } from '@/components/loading';
import { PublicMcqCard } from '@/components/marketing/public-mcq-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { SearchField } from '@/components/ui/search-field';
import { Skeleton } from '@/components/ui/skeleton';
import { AnswerVisibilityToggle } from '@/features/public-question-bank/answer-visibility-toggle';
import { useAnswerVisibility } from '@/features/public-question-bank/use-answer-visibility';
import { getTopicSet, listTopicSetQuestions } from '@/lib/api/topic-questions';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { ALL_TOPICS_PATH, topicExplorerHref } from '@/lib/homepage-tile-links';
import { cn } from '@/lib/utils';

type Props = {
  batchId: string;
  className?: string;
};

export function TopicSetView({ batchId, className }: Props) {
  const [qInput, setQInput] = useState('');
  const q = useDebouncedValue(qInput.trim(), 350);
  const visibility = useAnswerVisibility();

  const setQry = useQuery({
    queryKey: ['topic-set', batchId],
    queryFn: () => getTopicSet(batchId),
  });

  const list = useInfiniteQuery({
    queryKey: ['topic-set-questions', batchId, q],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listTopicSetQuestions(batchId, {
        cursor: pageParam,
        limit: 20,
        q: q || undefined,
      }),
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
  });

  const items = list.data?.pages.flatMap((p) => p.data) ?? [];
  const individualMode = visibility.mode === 'hide-all';

  const backHref = setQry.data
    ? topicExplorerHref({
        categoryId: setQry.data.categoryId,
        subcategoryId: setQry.data.subcategoryId,
        childCategoryId: setQry.data.childCategoryId,
      })
    : ALL_TOPICS_PATH;

  const pathLabel = setQry.data
    ? [
        setQry.data.category.name,
        setQry.data.subcategory.name,
        setQry.data.childCategory?.name,
      ]
        .filter(Boolean)
        .join(' / ')
    : '';

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted-strong)] hover:text-[var(--highlight)]"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Link>
      </div>

      {setQry.isLoading ? (
        <div className="space-y-3 border-b border-[var(--line)] pb-5">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-8 w-2/3 max-w-lg" />
        </div>
      ) : null}
      {setQry.isError ? <LoadError message="Collection not found." /> : null}
      {setQry.data ? (
        <header className="space-y-2 border-b border-[var(--line)] pb-5">
          {pathLabel ? (
            <p className="text-sm font-medium text-[var(--muted-strong)]">{pathLabel}</p>
          ) : null}
          <h1 className="font-display text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-tight text-[var(--ink)]">
            {setQry.data.title}
          </h1>
        </header>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <AnswerVisibilityToggle mode={visibility.mode} onChange={visibility.setMode} />
        <SearchField
          value={qInput}
          onChange={setQInput}
          placeholder="Search in this collection…"
          aria-label="Search in this collection"
          className="min-w-0 flex-1 lg:max-w-md"
        />
      </div>

      {list.isLoading ? <ListCardSkeleton rows={3} rowClassName="min-h-56 py-6" /> : null}
      {list.isError ? (
        <LoadError
          message="Could not load questions."
          onRetry={() => void list.refetch()}
        />
      ) : null}
      {!list.isLoading && !list.isError && items.length === 0 ? (
        <EmptyState align="center" title="No matching questions" />
      ) : null}

      <ul className="space-y-4">
        {items.map((question) => {
          const withExam = {
            ...question,
            sourceNote: question.examLabel ?? question.sourceNote,
          };
          return (
            <li key={question.id} className="space-y-2">
              {question.examLabel ? (
                <p className="px-1 text-xs font-medium text-[var(--muted-strong)]">
                  {question.examLabel}
                </p>
              ) : null}
              <PublicMcqCard
                question={withExam}
                answerVisible={visibility.isAnswerVisible(question.id)}
                allowIndividualToggle={individualMode}
                onToggleAnswer={() => visibility.toggleQuestion(question.id)}
              />
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
