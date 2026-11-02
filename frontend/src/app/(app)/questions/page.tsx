'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Suspense } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { QuestionFilters } from '@/components/questions/question-filters';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, apiFetch, apiFetchResult } from '@/lib/api/client';
import type { CategoryNode, QuestionListItem } from '@/lib/api/types';

function buildQuery(sp: URLSearchParams, cursor?: string) {
  const q = new URLSearchParams();
  for (const key of ['q', 'categoryId', 'subcategoryId', 'difficulty'] as const) {
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Question bank"
        description="Search and filter published MCQs. Authentication required."
      />

      <QuestionFilters categories={categories.data ?? []} />

      {list.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}

      {unauthorized ? (
        <Alert variant="warning">
          Sign in to browse the question bank.{' '}
          <Link href="/login" className="font-semibold underline-offset-2 hover:underline">
            Sign in
          </Link>{' '}
          or{' '}
          <Link href="/register" className="font-semibold underline-offset-2 hover:underline">
            start a free trial
          </Link>
          .
        </Alert>
      ) : null}

      {list.isError && !unauthorized ? (
        <Alert variant="danger">Could not load questions. Try again shortly.</Alert>
      ) : null}

      {!list.isLoading && !list.isError && items.length === 0 ? (
        <EmptyState
          title="No questions match"
          description="Try clearing filters or check back after new items are published."
          action={
            <Link href="/questions">
              <Button variant="outline" size="sm">
                Reset filters
              </Button>
            </Link>
          }
        />
      ) : null}

      <div className="grid gap-3">
        {items.map((q) => (
          <Link
            key={q.id}
            href={`/questions/${q.id}${filterKey ? `?${filterKey}` : ''}`}
            className="group block rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)] transition-[border-color,box-shadow] duration-[var(--duration-fast)] hover:border-[var(--line-strong)] hover:shadow-[var(--shadow)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--ink)]">{q.title}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {q.category.name}
                  {q.subcategory ? ` · ${q.subcategory.name}` : ''}
                </p>
              </div>
              <Badge variant="highlight">{q.difficulty}</Badge>
            </div>
          </Link>
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
