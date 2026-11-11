'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { Suspense } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { FilterChips } from '@/components/questions/filter-chips';
import { QuestionFilters } from '@/components/questions/question-filters';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ListRow } from '@/components/ui/list-row';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, apiFetch, apiFetchResult } from '@/lib/api/client';
import type { CategoryNode, QuestionListItem } from '@/lib/api/types';

function buildQuery(sp: URLSearchParams, cursor?: string) {
  const q = new URLSearchParams();
  for (const key of ['q', 'categoryId', 'subcategoryId', 'difficulty', 'examTag'] as const) {
    const v = sp.get(key);
    if (v) q.set(key, v);
  }
  q.set('limit', '12');
  if (cursor) q.set('cursor', cursor);
  return q.toString();
}

function QuestionsContent() {
  const searchParams = useSearchParams();
  const filterKey = searchParams.toString();
  const q = searchParams.get('q') ?? undefined;
  const categoryId = searchParams.get('categoryId') ?? undefined;
  const subcategoryId = searchParams.get('subcategoryId') ?? undefined;
  const difficulty = searchParams.get('difficulty') ?? undefined;
  const examTag = searchParams.get('examTag') ?? undefined;
  const hasFilters = Boolean(q || categoryId || subcategoryId || difficulty || examTag);

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories'),
  });

  const list = useInfiniteQuery({
    queryKey: ['questions', filterKey],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const qs = buildQuery(searchParams, pageParam);
      return apiFetchResult<QuestionListItem[]>(`/questions?${qs}`);
    },
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
    retry: false,
  });

  const unauthorized =
    list.error instanceof ApiError && (list.error.status === 401 || list.error.status === 403);
  const items = list.data?.pages.flatMap((p) => p.data) ?? [];
  const hasMore = Boolean(list.hasNextPage);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Practice"
        title="MCQ practice"
        description="Search and filter published questions, then open one to check yourself."
      />

      <QuestionFilters categories={categories.data ?? []} />

      <FilterChips
        categories={categories.data ?? []}
        q={q}
        categoryId={categoryId}
        subcategoryId={subcategoryId}
        difficulty={difficulty}
        examTag={examTag}
      />

      {!list.isLoading && !list.isError ? (
        <p className="text-sm text-[var(--muted-strong)]" aria-live="polite">
          Showing{' '}
          <span className="font-semibold text-[var(--ink-soft)] tabular-nums">{items.length}</span>
          {hasMore ? '+' : ''} question{items.length === 1 ? '' : 's'}
          {hasFilters ? ' matching your filters' : ''}
        </p>
      ) : null}

      {list.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : null}

      {unauthorized ? (
        <EmptyState
          title="Sign in to browse"
          description="The question bank requires an account. Start a free seven-day trial to unlock answers and explanations."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Start free trial</Button>
              </Link>
            </div>
          }
        />
      ) : null}

      {list.isError && !unauthorized ? (
        <Alert variant="danger">Could not load questions. Try again shortly.</Alert>
      ) : null}

      {!list.isLoading && !list.isError && items.length === 0 ? (
        <EmptyState
          title="No questions match"
          description={
            hasFilters
              ? 'Try clearing a filter chip or broadening your search.'
              : 'Check back after new items are published.'
          }
          action={
            hasFilters ? (
              <Link href="/questions">
                <Button variant="outline" size="sm">
                  Reset filters
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : null}

      <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {items.map((item) => (
          <ListRow
            key={item.id}
            href={`/questions/${item.id}${filterKey ? `?${filterKey}` : ''}`}
            className="motion-press"
            meta={
              <>
                <span>
                  {item.category.name}
                  {item.subcategory ? ` · ${item.subcategory.name}` : ''}
                </span>
                <Badge variant="highlight">{item.difficulty}</Badge>
              </>
            }
            title={
              <span className="font-display text-lg font-semibold tracking-tight">{item.title}</span>
            }
            trailing={<ChevronRight className="h-4 w-4 text-[var(--muted-strong)]" aria-hidden />}
          />
        ))}
      </div>

      {list.hasNextPage ? (
        <Button
          variant="outline"
          disabled={list.isFetchingNextPage}
          onClick={() => void list.fetchNextPage()}
        >
          {list.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      ) : null}
    </div>
  );
}

export default function QuestionsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
        </div>
      }
    >
      <QuestionsContent />
    </Suspense>
  );
}
