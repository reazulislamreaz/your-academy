'use client';

import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FolderOpen, Search } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { listPublicQuestionSets } from '@/lib/api/public-questions';
import { cn } from '@/lib/utils';

type Props = {
  initialQ?: string;
  className?: string;
};

function formatUploadDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Preli landing: Exam Sets only (name + upload date). Questions live on the set page. */
export function PublicQuestionBank({ initialQ = '', className }: Props) {
  const [qInput, setQInput] = useState(initialQ);
  const [q, setQ] = useState(initialQ);

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

  return (
    <div className={cn('space-y-6', className)}>
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
            placeholder="Search collections…"
            className="pl-9"
            aria-label="Search collections"
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
        <ul className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <li
              key={i}
              className="h-[4.5rem] animate-pulse rounded-[1rem] border border-[var(--line)] bg-white"
            />
          ))}
        </ul>
      ) : null}

      {list.isError ? (
        <Alert variant="danger">Could not load exam sets. Please try again.</Alert>
      ) : null}

      {!list.isLoading && !list.isError && sets.length === 0 ? (
        <div className="rounded-[1.25rem] border border-dashed border-[var(--line)] bg-white px-6 py-16 text-center">
          <FolderOpen className="mx-auto size-10 text-[var(--muted)] opacity-50" />
          <p className="mt-3 font-display text-lg font-bold text-[var(--ink)]">No collections yet</p>
          <p className="mt-2 text-sm text-[var(--muted-strong)]">
            Each admin upload appears here as its own collection.
          </p>
        </div>
      ) : null}

      <ul className="space-y-3">
        {sets.map((set) => (
          <li key={set.id}>
            <Link
              href={`/preli-question-bank/${set.id}`}
              className="block rounded-[1rem] border border-[var(--line)] bg-white px-5 py-4 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-[var(--highlight)] hover:shadow-[var(--shadow)]"
            >
              <h2 className="font-display text-lg font-bold tracking-tight text-[var(--ink)] sm:text-xl">
                {set.title}
              </h2>
              <p className="mt-1.5 text-sm text-[var(--muted-strong)]">
                {formatUploadDate(set.uploadedAt)}
              </p>
            </Link>
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
            {list.isFetchingNextPage ? 'Loading…' : 'Load more collections'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
