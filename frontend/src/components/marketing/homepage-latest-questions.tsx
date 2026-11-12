'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { listPublicQuestionSets } from '@/lib/api/public-questions';

/** Latest upload-based Question Sets on the marketing homepage. */
export function HomepageLatestQuestions({ limit = 6 }: { limit?: number }) {
  const list = useQuery({
    queryKey: ['public-question-sets-home', limit],
    queryFn: () => listPublicQuestionSets({ limit }),
    staleTime: 30_000,
  });

  const items = list.data?.data ?? [];
  const total = list.data?.pagination?.total;

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
              Latest Question Sets
            </h2>
            <p className="text-sm text-[var(--muted-strong)] sm:text-base">
              Each admin upload is a separate set
              {total != null ? ` · ${total.toLocaleString()} available` : ''}.
            </p>
          </div>
          <Link href="/preli-question-bank">
            <Button type="button" className="cursor-pointer rounded-full px-6">
              Preli Question Bank
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>

        {list.isLoading ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <li
                key={i}
                className="h-40 animate-pulse rounded-[1.25rem] border border-[var(--line)] bg-white"
              />
            ))}
          </ul>
        ) : null}

        {list.isError ? (
          <Alert variant="danger">Could not load question sets.</Alert>
        ) : null}

        {!list.isLoading && !list.isError && items.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-[var(--line)] bg-white px-6 py-12 text-center text-sm text-[var(--muted-strong)]">
            No published question sets yet. Admin uploads appear here automatically.
          </div>
        ) : null}

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((set) => (
            <li key={set.id}>
              <Link
                href={`/preli-question-bank/${set.id}`}
                className="flex h-full flex-col rounded-[1.25rem] border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-[var(--highlight)] hover:shadow-[var(--shadow)]"
              >
                <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                  Question set
                </p>
                <h3 className="mt-2 font-display text-lg font-bold tracking-tight text-[var(--ink)]">
                  {set.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--muted-strong)]">
                  {set.questionCount} questions
                  {set.subject ? ` · ${set.subject}` : ''}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--highlight)]">
                  View questions
                  <ArrowRight className="size-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
