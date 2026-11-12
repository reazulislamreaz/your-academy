'use client';

import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, CalendarDays, FolderOpen, Search } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { listPublicQuestionSets } from '@/lib/api/public-questions';
import { AnswerVisibilityToggle } from './answer-visibility-toggle';
import { useAnswerVisibility } from './use-answer-visibility';
import { cn } from '@/lib/utils';

type Props = {
  initialQ?: string;
  className?: string;
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Preli bank hub: one card per admin upload batch (Question Set). */
export function PublicQuestionBank({ initialQ = '', className }: Props) {
  const [qInput, setQInput] = useState(initialQ);
  const [q, setQ] = useState(initialQ);
  const visibility = useAnswerVisibility();

  const list = useInfiniteQuery({
    queryKey: ['public-question-sets', q],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listPublicQuestionSets({
        cursor: pageParam,
        limit: 20,
        q: q || undefined,
      }),
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
  });

  const sets = list.data?.pages.flatMap((p) => p.data) ?? [];
  const total = list.data?.pages[0]?.pagination?.total ?? null;

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <AnswerVisibilityToggle mode={visibility.mode} onChange={visibility.setMode} />
        {total != null ? (
          <p className="text-sm font-medium text-[var(--muted-strong)]">
            {total.toLocaleString()} question set{total === 1 ? '' : 's'}
          </p>
        ) : null}
      </div>

      <form
        className="flex flex-col gap-3 rounded-[1rem] border border-[var(--line)] bg-white p-4 shadow-[var(--shadow-sm)] sm:flex-row"
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
            placeholder="Search question sets…"
            className="pl-9"
            aria-label="Search question sets"
          />
        </div>
        <div className="flex gap-2">
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
            }}
          >
            Reset
          </Button>
        </div>
      </form>

      {list.isLoading ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <li
              key={i}
              className="h-40 animate-pulse rounded-[1.25rem] border border-[var(--line)] bg-white"
            />
          ))}
        </ul>
      ) : null}

      {list.isError ? (
        <Alert variant="danger">Could not load question sets. Please try again.</Alert>
      ) : null}

      {!list.isLoading && !list.isError && sets.length === 0 ? (
        <div className="rounded-[1.25rem] border border-dashed border-[var(--line)] bg-white px-6 py-16 text-center">
          <FolderOpen className="mx-auto size-10 text-[var(--muted)] opacity-50" />
          <p className="mt-3 font-display text-lg font-bold text-[var(--ink)]">No question sets yet</p>
          <p className="mt-2 text-sm text-[var(--muted-strong)]">
            Each admin bulk upload becomes its own question set here.
          </p>
        </div>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2">
        {sets.map((set) => (
          <li key={set.id}>
            <article className="flex h-full flex-col rounded-[1.25rem] border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]">
              <div className="space-y-2">
                <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                  Question set
                </p>
                <h2 className="font-display text-lg font-bold tracking-tight text-[var(--ink)]">
                  {set.title}
                </h2>
                {set.description ? (
                  <p className="line-clamp-2 text-sm text-[var(--muted-strong)]">{set.description}</p>
                ) : null}
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <BookOpen className="mt-0.5 size-4 shrink-0 text-[var(--muted)]" aria-hidden />
                  <div>
                    <dt className="text-xs text-[var(--muted)]">Questions</dt>
                    <dd className="font-semibold text-[var(--ink)]">{set.questionCount}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CalendarDays className="mt-0.5 size-4 shrink-0 text-[var(--muted)]" aria-hidden />
                  <div>
                    <dt className="text-xs text-[var(--muted)]">Uploaded</dt>
                    <dd className="font-semibold text-[var(--ink)]">
                      {formatDate(set.importedAt ?? set.uploadedAt)}
                    </dd>
                  </div>
                </div>
                {set.subject ? (
                  <div className="col-span-2">
                    <dt className="text-xs text-[var(--muted)]">Subject</dt>
                    <dd className="font-medium text-[var(--ink-soft)]">
                      {set.subject}
                      {set.topic ? ` · ${set.topic}` : ''}
                    </dd>
                  </div>
                ) : null}
                {set.examCategory ? (
                  <div className="col-span-2">
                    <dt className="text-xs text-[var(--muted)]">Exam</dt>
                    <dd className="font-medium text-[var(--ink-soft)]">{set.examCategory}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="mt-5 pt-1">
                <Link href={`/preli-question-bank/${set.id}`}>
                  <Button type="button" className="w-full cursor-pointer sm:w-auto">
                    View questions
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            </article>
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
            {list.isFetchingNextPage ? 'Loading…' : 'Load more sets'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
