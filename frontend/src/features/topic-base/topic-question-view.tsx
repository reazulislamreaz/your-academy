'use client';

import Link from 'next/link';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { ListCardSkeleton, LoadError } from '@/components/loading';
import { GoForExamCta } from '@/components/marketing/go-for-exam-cta';
import { PublicMcqCard } from '@/components/marketing/public-mcq-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { SearchField } from '@/components/ui/search-field';
import { Skeleton } from '@/components/ui/skeleton';
import { AnswerVisibilityToggle } from '@/features/public-question-bank/answer-visibility-toggle';
import { useAnswerVisibility } from '@/features/public-question-bank/use-answer-visibility';
import { getTopicSubcategory, listTopicQuestions } from '@/lib/api/topic-questions';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { ALL_TOPICS_PATH } from '@/lib/homepage-tile-links';
import { cn } from '@/lib/utils';

type Props = {
  subcategoryId: string;
  className?: string;
};

export function TopicQuestionView({ subcategoryId, className }: Props) {
  const [qInput, setQInput] = useState('');
  const q = useDebouncedValue(qInput.trim(), 350);
  const visibility = useAnswerVisibility();

  const meta = useQuery({
    queryKey: ['topic-subcategory', subcategoryId],
    queryFn: () => getTopicSubcategory(subcategoryId),
  });

  const list = useInfiniteQuery({
    queryKey: ['topic-questions', subcategoryId, q],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listTopicQuestions(subcategoryId, {
        cursor: pageParam,
        limit: 20,
        q: q || undefined,
      }),
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
  });

  const items = list.data?.pages.flatMap((p) => p.data) ?? [];
  const individualMode = visibility.mode === 'hide-all';

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={ALL_TOPICS_PATH}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted-strong)] hover:text-[var(--highlight)]"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All topics
        </Link>
      </div>

      <GoForExamCta compact />

      {meta.isLoading ? (
        <div className="space-y-3 rounded-[1rem] border border-[var(--line)] bg-[var(--bg-elevated)] px-5 py-5 shadow-[var(--shadow-sm)]">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-2/3 max-w-lg" />
        </div>
      ) : null}
      {meta.isError ? <LoadError message="Topic not found." /> : null}
      {meta.data ? (
        <header className="space-y-3 border-b border-[var(--line)] pb-5">
          <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
            Topic Base Question Analysis
          </p>
          <h1 className="font-display text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-tight text-[var(--ink)]">
            {meta.data.name}
          </h1>
          <p className="text-sm text-[var(--muted-strong)]">
            {meta.data.category.name}
            {meta.data.questionCount ? ` · ${meta.data.questionCount} questions` : null}
          </p>
          {meta.data.description ? (
            <p className="text-sm text-[var(--muted-strong)]">{meta.data.description}</p>
          ) : null}
        </header>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <AnswerVisibilityToggle mode={visibility.mode} onChange={visibility.setMode} />
        <SearchField
          value={qInput}
          onChange={setQInput}
          placeholder="Search in this topic…"
          aria-label="Search in this topic"
          className="min-w-0 flex-1 lg:max-w-md"
        />
      </div>

      {list.isLoading ? (
        <ListCardSkeleton rows={3} rowClassName="min-h-56 py-6" />
      ) : null}
      {list.isError ? (
        <LoadError
          message="Could not load questions."
          onRetry={() => void list.refetch()}
        />
      ) : null}
      {!list.isLoading && !list.isError && items.length === 0 ? (
        <EmptyState
          align="center"
          title="No questions yet"
          description="Questions uploaded for this topic will appear here."
        />
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
