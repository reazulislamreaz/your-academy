'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ListCardSkeleton, LoadError } from '@/components/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { listPublicQuestions, type PublicQuestionCard } from '@/lib/api/public-questions';

function McqPreviewCard({ question }: { question: PublicQuestionCard }) {
  return (
    <article className="ya-panel overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow-sm)]">
      <div className="border-b border-[var(--line)] bg-[var(--bg-desk)] px-4 py-3 sm:px-5">
        <p className="text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">
          Sample from Preli bank
        </p>
        <h3 className="mt-1 font-display text-base font-bold text-[var(--ink)] sm:text-lg">
          {question.category.name}
          {question.subcategory ? ` · ${question.subcategory.name}` : ''}
        </h3>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <p className="font-reading type-prose text-[0.95rem] leading-relaxed text-[var(--ink)]">
          {question.content}
        </p>
        <ul className="space-y-2">
          {question.options.map((opt) => (
            <li
              key={opt.id}
              className="font-reading flex gap-2.5 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-desk)] px-3 py-2.5 text-sm text-[var(--ink-soft)]"
            >
              <span className="font-semibold text-[var(--accent)]">{opt.label}.</span>
              <span>{opt.content}</span>
            </li>
          ))}
        </ul>
        <p className="rounded-lg bg-[var(--success-soft)] px-3 py-2 text-sm font-medium text-[var(--success-fg)]">
          Correct answer: {question.correctAnswerLabel}
          {question.correctAnswerBn ? ` — ${question.correctAnswerBn}` : ''}
        </p>
        <p className="text-xs text-[var(--muted)]">
          Public Preli cards show answers. After your trial, learner practice APIs omit answers unless
          you are entitled.
        </p>
      </div>
    </article>
  );
}

/** Interactive preview using a real published public question. */
export function HomepageSampleMcq() {
  const list = useQuery({
    queryKey: ['homepage-sample-mcq'],
    queryFn: () => listPublicQuestions({ limit: 1 }),
    staleTime: 60_000,
  });

  const question = list.data?.data?.[0] ?? null;

  return (
    <section
      id="mcq-preview"
      aria-labelledby="mcq-preview-heading"
      className="scroll-mt-24 bg-[var(--bg-elevated)] py-[var(--space-section)]"
    >
      <div className="marketing-container space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <span className="mb-1 block h-[3px] w-7 rounded-full bg-[var(--highlight)]" aria-hidden />
            <h2
              id="mcq-preview-heading"
              className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-[2rem]"
            >
              Try a real MCQ
            </h2>
            <p className="text-sm text-[var(--muted-strong)] sm:text-base">
              Loaded from published questions in the database — not a demo stub.
            </p>
          </div>
          <Link href="/preli-question-bank">
            <Button className="rounded-full px-6">
              Explore Question Bank
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        </div>

        {list.isLoading ? <ListCardSkeleton /> : null}
        {list.isError ? (
          <LoadError message="Could not load a sample question." onRetry={() => void list.refetch()} />
        ) : null}
        {!list.isLoading && !list.isError && !question ? (
          <EmptyState
            title="No published questions yet"
            description="When admins publish MCQs, a live sample will appear here."
          />
        ) : null}
        {question ? <McqPreviewCard question={question} /> : null}
      </div>
    </section>
  );
}
