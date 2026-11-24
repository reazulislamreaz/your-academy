'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, CircleHelp, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ListCardSkeleton, LoadError } from '@/components/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { HomepageReveal } from '@/components/marketing/homepage-gsap';
import {
  listPublicQuestions,
  type PublicQuestionCard,
} from '@/lib/api/public-questions';
import type { ApiResult } from '@/lib/api/client';
import { cn } from '@/lib/utils';

function McqPreviewCard({ question }: { question: PublicQuestionCard }) {
  const [picked, setPicked] = useState<string | null>(null);
  // A question without a marked correct option has an empty label — picking only marks it.
  const correctLabel = question.correctAnswerLabel;
  const hasAnswer = Boolean(correctLabel);
  const categoryLine = [
    question.category.name,
    question.subcategory?.name,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="hp-panel relative overflow-hidden rounded-[var(--hp-radius-lg)] ring-1 ring-black/[0.03]">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 z-[1] h-px bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--highlight)_55%,transparent)] to-transparent"
      />

      <header className="flex items-start justify-between gap-3 border-b border-[var(--hp-panel-border)] bg-[color-mix(in_srgb,var(--bg-muted)_45%,var(--bg-elevated))] px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-semibold tracking-[0.1em] text-[var(--muted)] uppercase">
            Sample from Preli bank
          </p>
          <h3 className="mt-1 truncate font-display text-base font-semibold tracking-tight text-[var(--ink)] sm:text-lg">
            {categoryLine}
          </h3>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--hp-panel-border)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[0.65rem] font-semibold text-[var(--muted-strong)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" aria-hidden />
          Live
        </span>
      </header>

      <div className="space-y-5 p-4 sm:p-5 sm:pt-5">
        <div className="flex items-center gap-3">
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--bg-muted)]" aria-hidden>
            <div className="h-full w-[32%] rounded-full bg-[var(--highlight)]" />
          </div>
          <span className="shrink-0 text-[0.7rem] font-semibold text-[var(--muted)]">
            Preview
          </span>
        </div>

        <div className="space-y-2">
          <p className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold tracking-[0.06em] text-[var(--muted)] uppercase">
            <CircleHelp className="h-3.5 w-3.5 text-[var(--highlight)]" aria-hidden />
            Question
          </p>
          <p className="font-reading type-prose text-[1.02rem] leading-relaxed text-[var(--ink)] sm:text-[1.05rem]">
            {question.content}
          </p>
        </div>

        <ul className="space-y-2.5" role="list">
          {question.options.map((opt, idx) => {
            const isCorrect = hasAnswer && opt.label === correctLabel;
            const selected = picked === opt.id;
            const revealed = picked != null;
            return (
              <li key={opt.id}>
                <button
                  type="button"
                  onClick={() => setPicked(opt.id)}
                  disabled={picked != null}
                  className={cn(
                    'font-reading group/opt flex w-full min-h-12 gap-3 rounded-[0.875rem] border px-3.5 py-3 text-left text-sm transition-[transform,border-color,background-color,box-shadow] duration-200',
                    !revealed &&
                      'border-[var(--hp-panel-border)] bg-[var(--bg)] text-[var(--ink-soft)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--highlight)_28%,var(--line))] hover:bg-[var(--bg-elevated)] hover:shadow-[var(--shadow-sm)]',
                    revealed &&
                      isCorrect &&
                      'border-[var(--success)] bg-[var(--success-soft)] text-[var(--ink)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--success)_20%,transparent)]',
                    revealed &&
                      selected &&
                      !isCorrect &&
                      'border-[var(--highlight)] bg-[var(--highlight-soft)] text-[var(--ink)]',
                    revealed &&
                      !selected &&
                      !isCorrect &&
                      'border-[var(--hp-panel-border)] bg-[var(--bg)] opacity-50',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.72rem] font-bold transition-colors',
                      revealed && isCorrect
                        ? 'bg-[var(--success)] text-white'
                        : selected
                          ? 'bg-[var(--highlight)] text-white'
                          : 'bg-[var(--bg-muted)] text-[var(--muted-strong)] group-hover/opt:bg-[var(--highlight-soft)] group-hover/opt:text-[var(--highlight)]',
                    )}
                  >
                    {opt.label || String.fromCharCode(65 + idx)}
                  </span>
                  <span className="min-w-0 flex-1 leading-relaxed">{opt.content}</span>
                  {revealed && isCorrect ? (
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[var(--success)]" />
                  ) : null}
                  {revealed && selected && !isCorrect && hasAnswer ? (
                    <XCircle className="mt-1 h-4 w-4 shrink-0 text-[var(--highlight)]" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        {picked && hasAnswer ? (
          <p
            className={cn(
              'rounded-[0.875rem] px-3.5 py-3 text-sm font-semibold',
              picked ===
                question.options.find((o) => o.label === correctLabel)?.id
                ? 'bg-[var(--success-soft)] text-[var(--success-fg)]'
                : 'bg-[var(--highlight-soft)] text-[var(--highlight)]',
            )}
            role="status"
          >
            Correct answer: {correctLabel}
            {question.correctAnswerBn ? ` — ${question.correctAnswerBn}` : ''}
          </p>
        ) : null}
        {!picked ? (
          <p className="text-xs leading-relaxed text-[var(--muted)]">
            Tap an option to try it. This is a live published Preli question.
          </p>
        ) : null}
      </div>
    </article>
  );
}

type Props = {
  initial?: ApiResult<PublicQuestionCard[]> | null;
  content?: {
    eyebrow?: string;
    ctaLabel?: string;
    ctaHref?: string;
  };
};

export function HomepageSampleMcq({ initial = null, content }: Props) {
  const list = useQuery({
    queryKey: ['homepage-sample-mcq'],
    queryFn: () => listPublicQuestions({ limit: 1 }),
    staleTime: 60_000,
    initialData: initial ?? undefined,
  });

  const question = list.data?.data?.[0] ?? null;
  const showSkeleton = list.isLoading && !question;
  const eyebrow =
    content?.eyebrow?.trim() ||
    'Loaded from published questions in the database — not a demo stub.';

  return (
    <section
      id="mcq-preview"
      aria-labelledby="mcq-preview-heading"
      className="hp-section relative overflow-hidden"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_70%_at_85%_20%,color-mix(in_srgb,var(--highlight)_5%,transparent),transparent_65%)]"
      />

      <HomepageReveal className="marketing-container relative grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14 xl:gap-16">
        <div className="space-y-5 lg:max-w-md">
          <span className="hp-mark" aria-hidden />
          <p className="hp-eyebrow">Live preview</p>
          <div className="space-y-3">
            <h2
              id="mcq-preview-heading"
              className="hp-heading text-[1.6rem] sm:text-[1.9rem]"
            >
              Try a real MCQ
            </h2>
            <p className="hp-lede text-sm sm:text-[0.975rem]">{eyebrow}</p>
          </div>

          <ul className="space-y-2.5 text-sm text-[var(--ink-soft)]">
            {[
              'Live question from the Preli bank',
              'Tap an option to check your answer instantly',
              'Same reading face used in practice mode',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--highlight)]"
                  aria-hidden
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <Link href={content?.ctaHref || '/preli-question-bank'} className="inline-flex pt-1">
            <Button className="min-h-11 rounded-full px-6 font-semibold shadow-[var(--hp-cta-shadow)]">
              {content?.ctaLabel || 'Explore Question Bank'}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        </div>

        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-[radial-gradient(ellipse_at_50%_40%,color-mix(in_srgb,var(--highlight)_8%,transparent),transparent_70%)]"
          />
          <div className="relative">
            {showSkeleton ? <ListCardSkeleton /> : null}
            {list.isError ? (
              <LoadError
                message="Could not load a sample question."
                onRetry={() => void list.refetch()}
              />
            ) : null}
            {!showSkeleton && !list.isError && !question ? (
              <EmptyState
                title="No published questions yet"
                description="When admins publish MCQs, a live sample will appear here."
              />
            ) : null}
            {question ? <McqPreviewCard question={question} /> : null}
          </div>
        </div>
      </HomepageReveal>
    </section>
  );
}
