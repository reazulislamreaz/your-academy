'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { PublicMcqCard } from '@/components/marketing/public-mcq-card';
import { listPublicQuestions } from '@/lib/api/public-questions';
import { apiFetch } from '@/lib/api/client';
import type { CategoryNode } from '@/lib/api/types';
import { EXAM_TRACKS } from '@/lib/exam-tags';
import { cn } from '@/lib/utils';

type Props = {
  initialQ?: string;
  initialExamTag?: string;
  pageSize?: number;
  className?: string;
};

export function PublicQuestionBank({
  initialQ = '',
  initialExamTag = '',
  pageSize = 12,
  className,
}: Props) {
  const [qInput, setQInput] = useState(initialQ);
  const [q, setQ] = useState(initialQ);
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [examTag, setExamTag] = useState(initialExamTag);

  const categories = useQuery({
    queryKey: ['public-categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories', { skipRefresh: true }),
    staleTime: 60_000,
  });

  const selectedSubject = useMemo(
    () => (categories.data ?? []).find((c) => c.id === categoryId),
    [categories.data, categoryId],
  );

  const list = useInfiniteQuery({
    queryKey: ['public-questions', q, categoryId, subcategoryId, examTag, pageSize],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listPublicQuestions({
        cursor: pageParam,
        limit: pageSize,
        q: q || undefined,
        categoryId: categoryId || undefined,
        subcategoryId: subcategoryId || undefined,
        examTag: examTag || undefined,
      }),
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
  });

  const items = list.data?.pages.flatMap((p) => p.data) ?? [];
  const total = list.data?.pages[0]?.pagination?.total ?? null;

  return (
    <div className={cn('space-y-6', className)}>
      <form
        className="grid gap-3 rounded-[1rem] border border-[var(--line)] bg-white p-4 shadow-[var(--shadow-sm)] sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(qInput.trim());
        }}
      >
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--muted)]" />
          <Input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Search questions…"
            className="pl-9"
            aria-label="Search questions"
          />
        </div>
        <Select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setSubcategoryId('');
          }}
          aria-label="Subject"
        >
          <option value="">All subjects</option>
          {(categories.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          value={subcategoryId}
          onChange={(e) => setSubcategoryId(e.target.value)}
          disabled={!selectedSubject}
          aria-label="Topic"
        >
          <option value="">All topics</option>
          {(selectedSubject?.children ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Select
          value={examTag}
          onChange={(e) => setExamTag(e.target.value)}
          aria-label="Exam"
          className="sm:col-span-2 lg:col-span-2"
        >
          <option value="">All exams</option>
          {EXAM_TRACKS.map((t) => (
            <option key={t.tag} value={t.tag}>
              {t.label}
            </option>
          ))}
        </Select>
        <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-2">
          <Button type="submit" className="cursor-pointer">
            Search
          </Button>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => {
              setQInput('');
              setQ('');
              setCategoryId('');
              setSubcategoryId('');
              setExamTag('');
            }}
          >
            Reset
          </Button>
          {total != null ? (
            <p className="ml-auto text-sm font-medium text-[var(--muted-strong)]">
              {total.toLocaleString()} question{total === 1 ? '' : 's'}
            </p>
          ) : null}
        </div>
      </form>

      {list.isLoading ? (
        <ul className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <li
              key={i}
              className="h-56 animate-pulse rounded-[1.25rem] border border-[var(--line)] bg-white"
            />
          ))}
        </ul>
      ) : null}

      {list.isError ? (
        <Alert variant="danger">Could not load the question bank. Please try again.</Alert>
      ) : null}

      {!list.isLoading && !list.isError && items.length === 0 ? (
        <div className="rounded-[1.25rem] border border-dashed border-[var(--line)] bg-white px-6 py-16 text-center">
          <p className="font-display text-lg font-bold text-[var(--ink)]">No questions yet</p>
          <p className="mt-2 text-sm text-[var(--muted-strong)]">
            Published MCQs from admin uploads will appear here automatically.
          </p>
        </div>
      ) : null}

      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.id}>
            <PublicMcqCard question={item} />
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
