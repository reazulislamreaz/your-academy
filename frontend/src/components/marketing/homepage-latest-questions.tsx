'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PublicMcqCard } from '@/components/marketing/public-mcq-card';
import { listPublicQuestions } from '@/lib/api/public-questions';

/** Latest published MCQs for the marketing homepage (public, no login). */
export function HomepageLatestQuestions({ limit = 6 }: { limit?: number }) {
  const list = useQuery({
    queryKey: ['public-questions-home', limit],
    queryFn: () => listPublicQuestions({ limit }),
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
              Latest from the Question Bank
            </h2>
            <p className="text-sm text-[var(--muted-strong)] sm:text-base">
              Newest uploaded MCQs appear first
              {total != null ? ` · ${total.toLocaleString()} published` : ''}.
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
          <ul className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <li
                key={i}
                className="h-52 animate-pulse rounded-[1.25rem] border border-[var(--line)] bg-white"
              />
            ))}
          </ul>
        ) : null}

        {list.isError ? (
          <Alert variant="danger">Could not load latest questions.</Alert>
        ) : null}

        {!list.isLoading && !list.isError && items.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-[var(--line)] bg-white px-6 py-12 text-center text-sm text-[var(--muted-strong)]">
            No published questions yet. Admin uploads appear here automatically.
          </div>
        ) : null}

        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.id}>
              <PublicMcqCard question={item} />
            </li>
          ))}
        </ul>

        {items.length > 0 ? (
          <div className="flex justify-center pt-2">
            <Link href="/preli-question-bank">
              <Button type="button" variant="outline" className="cursor-pointer rounded-full px-6">
                Browse all questions
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
