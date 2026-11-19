'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ListCardSkeleton, LoadError } from '@/components/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { Reveal } from '@/components/motion/reveal';
import {
  listPublicQuestions,
  type PublicQuestionCard,
} from '@/lib/api/public-questions';
import type { ApiResult } from '@/lib/api/client';

function McqPreviewCard({ question }: { question: PublicQuestionCard }) {
  return (
    <article className="hp-surface overflow-hidden">
      <div className="border-b border-[var(--line)] bg-[linear-gradient(180deg,var(--bg-desk),color-mix(in_srgb,var(--bg-desk)_70%,white))] px-4 py-3 sm:px-5">
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
              className="font-reading flex gap-2.5 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-desk)] px-3 py-2.5 text-sm text-[var(--ink-soft)] transition-[border-color,background-color] duration-200 hover:border-[var(--accent)]/25 hover:bg-white"
            >
              <span className="font-semibold text-[var(--accent)]">{opt.label}.</span>
              <span>{opt.content}</span>
            </li>
          ))}
        </ul>
        <p className="rounded-lg border border-[var(--success)]/15 bg-[var(--success-soft)] px-3 py-2 text-sm font-medium text-[var(--success-fg)]">
          Correct answer: {question.correctAnswerLabel}
          {question.correctAnswerBn ? ` — ${question.correctAnswerBn}` : ''}
        </p>
        <p className="text-xs text-[var(--muted)]">
          Public Preli cards show answers. Learner practice APIs omit answers unless you are entitled.
        </p>
      </div>
    </article>
  );
}

type Props = {
  /** SSR seed — avoids a client waterfall after homepage paint. */
  initial?: ApiResult<PublicQuestionCard[]> | null;
  content?: {
    eyebrow?: string;
    ctaLabel?: string;
    ctaHref?: string;
  };
};

/** Interactive preview using a real published public question. */
export function HomepageSampleMcq({ initial = null, content }: Props) {
  const list = useQuery({
    queryKey: ['homepage-sample-mcq'],
    queryFn: () => listPublicQuestions({ limit: 1 }),
    staleTime: 60_000,
    initialData: initial ?? undefined,
  });

  const question = list.data?.data?.[0] ?? null;
  const showSkeleton = list.isLoading && !question;

  return (
    <section
      id="mcq-preview"
      aria-labelledby="mcq-preview-heading"
      className="scroll-mt-24 bg-[color-mix(in_srgb,var(--bg-elevated)_88%,transparent)] py-[var(--space-section)]"
    >
      <Reveal className="marketing-container space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <span className="hp-mark" aria-hidden />
            <h2 id="mcq-preview-heading" className="hp-heading text-2xl sm:text-[2rem]">
              Try a real MCQ
            </h2>
            <p className="hp-lede text-sm sm:text-base">
              {content?.eyebrow ||
                'Loaded from published questions in the database — not a demo stub.'}
            </p>
          </div>
          <Link href={content?.ctaHref || '/preli-question-bank'}>
            <Button className="rounded-full px-6 shadow-[0_10px_24px_-12px_rgba(227,30,36,0.45)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5">
              {content?.ctaLabel || 'Explore Question Bank'}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        </div>

        {showSkeleton ? <ListCardSkeleton /> : null}
        {list.isError ? (
          <LoadError message="Could not load a sample question." onRetry={() => void list.refetch()} />
        ) : null}
        {!showSkeleton && !list.isError && !question ? (
          <EmptyState
            title="No published questions yet"
            description="When admins publish MCQs, a live sample will appear here."
          />
        ) : null}
        {question ? <McqPreviewCard question={question} /> : null}
      </Reveal>
    </section>
  );
}
