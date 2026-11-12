'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { ListCardSkeleton, LoadError } from '@/components/loading';
import { Button } from '@/components/ui/button';
import { listPublicQuestionSets } from '@/lib/api/public-questions';

function formatUploadDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Latest Exam Sets on the marketing homepage (name + upload date). */
export function HomepageLatestQuestions({ limit = 6 }: { limit?: number }) {
  const list = useQuery({
    queryKey: ['public-question-sets-home', limit],
    queryFn: () => listPublicQuestionSets({ limit }),
    staleTime: 30_000,
  });

  const items = list.data?.data ?? [];

  return (
    <section className="section-pad bg-[var(--bg-desk)]">
      <div className="mx-auto w-full max-w-[1280px] space-y-6 px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <span
              className="mb-1 block h-[3px] w-7 rounded-full bg-[var(--highlight)]"
              aria-hidden
            />
            <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-[2rem]">
              Latest Collections
            </h2>
            <p className="text-sm text-[var(--muted-strong)] sm:text-base">
              Newest admin uploads appear first.
            </p>
          </div>
          <Link href="/preli-question-bank">
            <Button type="button" className="cursor-pointer rounded-full px-6">
              Preli Question Bank
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>

        {list.isLoading ? <ListCardSkeleton rows={3} /> : null}

        {list.isError ? (
          <LoadError
            message="Could not load exam sets."
            onRetry={() => void list.refetch()}
          />
        ) : null}

        {!list.isLoading && !list.isError && items.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-[var(--line)] bg-white px-6 py-12 text-center text-sm text-[var(--muted-strong)]">
            No collections yet. Admin uploads appear here automatically.
          </div>
        ) : null}

        <ul className="space-y-3">
          {items.map((set) => (
            <li key={set.id}>
              <Link
                href={`/preli-question-bank/${set.id}`}
                className="block rounded-[1rem] border border-[var(--line)] bg-white px-5 py-4 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-[var(--highlight)] hover:shadow-[var(--shadow)]"
              >
                <h3 className="font-display text-lg font-bold tracking-tight text-[var(--ink)]">
                  {set.title}
                </h3>
                <p className="mt-1.5 text-sm text-[var(--muted-strong)]">
                  {formatUploadDate(set.uploadedAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
