'use client';

import Link from 'next/link';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search } from 'lucide-react';
import { useState } from 'react';
import { ListCardSkeleton, LoadError } from '@/components/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PublicMcqCard } from '@/components/marketing/public-mcq-card';
import {
  getPublicQuestionSet,
  listPublicSetQuestions,
} from '@/lib/api/public-questions';
import { AnswerVisibilityToggle } from './answer-visibility-toggle';
import { useAnswerVisibility } from './use-answer-visibility';
import { cn } from '@/lib/utils';

type Props = {
  setId: string;
  className?: string;
};

export function PublicQuestionSetView({ setId, className }: Props) {
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const visibility = useAnswerVisibility();

  const setQry = useQuery({
    queryKey: ['public-question-set', setId],
    queryFn: () => getPublicQuestionSet(setId),
  });

  const list = useInfiniteQuery({
    queryKey: ['public-set-questions', setId, q],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listPublicSetQuestions(setId, {
        cursor: pageParam,
        limit: 20,
        q: q || undefined,
      }),
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
  });

  const items = list.data?.pages.flatMap((p) => p.data) ?? [];
  const total = list.data?.pages[0]?.pagination?.total ?? setQry.data?.questionCount ?? null;
  const individualMode = visibility.mode === 'hide-all';

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/preli-question-bank"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted-strong)] hover:text-[var(--highlight)]"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All question sets
        </Link>
      </div>

      {setQry.isLoading ? (
        <div className="space-y-3 rounded-[1rem] border border-[var(--line)] bg-[var(--bg-elevated)] px-5 py-5 shadow-[var(--shadow-sm)]">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-2/3 max-w-lg" />
          <Skeleton className="h-3.5 w-48" />
        </div>
      ) : null}
      {setQry.isError ? (
        <LoadError message="Question set not found or has no published questions." />
      ) : null}
      {setQry.data ? (
        <header className="space-y-2 border-b border-[var(--line)] pb-5">
          <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
            Question set
          </p>
          <h1 className="font-display text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-tight text-[var(--ink)]">
            {setQry.data.title}
          </h1>
          <p className="text-sm text-[var(--muted-strong)]">
            {total != null ? `${total.toLocaleString()} questions` : null}
            {setQry.data.subject ? ` · ${setQry.data.subject}` : ''}
            {setQry.data.topic ? ` · ${setQry.data.topic}` : ''}
            {setQry.data.examCategory ? ` · ${setQry.data.examCategory}` : ''}
          </p>
        </header>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <AnswerVisibilityToggle mode={visibility.mode} onChange={visibility.setMode} />
        <form
          className="flex min-w-0 flex-1 gap-2 lg:max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(qInput.trim());
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search in this set…"
              className="pl-9"
              aria-label="Search in this set"
            />
          </div>
          <Button type="submit" variant="outline" className="cursor-pointer shrink-0">
            Search
          </Button>
        </form>
      </div>

      {list.isLoading ? (
        <ListCardSkeleton
          rows={3}
          rowClassName="min-h-56 py-6"
        />
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
          title="No matching questions"
          description="No questions match your search in this set."
        />
      ) : null}

      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.id}>
            <PublicMcqCard
              question={item}
              answerVisible={visibility.isAnswerVisible(item.id)}
              allowIndividualToggle={individualMode}
              onToggleAnswer={() => visibility.toggleQuestion(item.id)}
            />
          </li>
        ))}
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
