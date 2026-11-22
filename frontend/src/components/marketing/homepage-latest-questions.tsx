'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { HomepagePayload } from '@your-academy/shared';
import { ListCardSkeleton, LoadError } from '@/components/loading';
import { Button } from '@/components/ui/button';
import { HomepageReveal } from '@/components/marketing/homepage-gsap';
import { listPublicQuestionSets } from '@/lib/api/public-questions';

function formatUploadDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

type Props = {
  latest: HomepagePayload['latest'];
};

/** Latest Exam Sets on the marketing homepage (headers from CMS; list from API). */
export function HomepageLatestQuestions({ latest }: Props) {
  const limit = latest.limit ?? 6;
  const list = useQuery({
    queryKey: ['public-question-sets-home', limit],
    queryFn: () => listPublicQuestionSets({ limit }),
    staleTime: 30_000,
    enabled: latest.visible,
  });

  if (!latest.visible) return null;

  const items = list.data?.data ?? [];

  return (
    <section
      id="latest-collections"
      aria-labelledby="latest-collections-heading"
      className="hp-section hp-library-pair-bottom"
    >
      <HomepageReveal className="marketing-container space-y-8 md:space-y-10" staggerChildren>
        <div
          className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8"
          data-hp-stagger
        >
          <div className="max-w-xl space-y-2.5 sm:space-y-3">
            <span className="hp-mark" aria-hidden />
            <p className="hp-eyebrow">Uploads</p>
            <h2
              id="latest-collections-heading"
              className="hp-heading text-[1.5rem] sm:text-2xl md:text-[1.9rem]"
            >
              {latest.heading}
            </h2>
            {latest.subtitle.trim() ? (
              <p className="hp-lede text-sm sm:text-[0.975rem]">{latest.subtitle}</p>
            ) : null}
          </div>
          {latest.cta.visible ? (
            <Link href={latest.cta.href} className="w-full shrink-0 sm:w-auto">
              <Button
                type="button"
                className="group min-h-11 w-full cursor-pointer rounded-full px-6 font-semibold shadow-[var(--hp-cta-shadow)] sm:w-auto"
              >
                {latest.cta.label}
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Button>
            </Link>
          ) : null}
        </div>

        {list.isLoading ? <ListCardSkeleton rows={4} /> : null}

        {list.isError ? (
          <LoadError message="Could not load exam sets." onRetry={() => void list.refetch()} />
        ) : null}

        {!list.isLoading && !list.isError && items.length === 0 ? (
          <div
            data-hp-stagger
            className="rounded-[var(--hp-radius)] border border-dashed border-[var(--hp-panel-border)] bg-[var(--bg-elevated)] px-6 py-12 text-center text-sm text-[var(--muted-strong)]"
          >
            No collections yet. Admin uploads appear here automatically.
          </div>
        ) : null}

        {items.length > 0 ? (
          <ul className="flex flex-col gap-3 sm:gap-3.5">
            {items.map((set, index) => (
              <li key={set.id} data-hp-stagger className="min-w-0">
                <Link
                  href={`/preli-question-bank/${set.id}`}
                  className="hp-list-link group flex w-full min-w-0 items-center gap-4 px-5 py-4 sm:gap-5 sm:px-6 sm:py-5"
                >
                  <span
                    className="hp-collection-index type-bn-serial hidden shrink-0 sm:inline-flex"
                    aria-hidden
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <h3 className="break-words font-display text-[0.975rem] font-bold leading-snug tracking-tight text-[var(--ink)] transition-colors duration-200 group-hover:text-[var(--highlight)] sm:text-base md:text-[1.05rem]">
                      {set.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)] sm:mt-2 sm:text-[0.875rem]">
                      {formatUploadDate(set.uploadedAt)}
                    </p>
                  </span>
                  <span
                    className="hp-collection-arrow inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--hp-panel-border)] bg-[color-mix(in_srgb,var(--bg-muted)_55%,white)] text-[var(--muted-strong)] transition-[border-color,background-color,color,transform] duration-200 group-hover:border-[color-mix(in_srgb,var(--highlight)_28%,var(--line))] group-hover:bg-[var(--highlight-soft)] group-hover:text-[var(--highlight)]"
                    aria-hidden
                  >
                    <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </HomepageReveal>
    </section>
  );
}
