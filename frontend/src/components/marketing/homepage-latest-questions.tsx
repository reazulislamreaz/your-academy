'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, FolderOpen } from 'lucide-react';
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
    <section className="hp-section hp-section-tone">
      <HomepageReveal className="marketing-container space-y-10 md:space-y-12" staggerChildren>
        <div
          className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8"
          data-hp-stagger
        >
          <div className="max-w-xl space-y-3">
            <span className="hp-mark" aria-hidden />
            <h2 className="hp-heading text-[1.5rem] sm:text-2xl md:text-[1.9rem]">
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
                className="group min-h-11 w-full cursor-pointer rounded-full px-6 font-semibold shadow-[0_10px_28px_-14px_rgba(227,30,36,0.4)] sm:w-auto"
              >
                {latest.cta.label}
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Button>
            </Link>
          ) : null}
        </div>

        {list.isLoading ? <ListCardSkeleton rows={3} /> : null}

        {list.isError ? (
          <LoadError
            message="Could not load exam sets."
            onRetry={() => void list.refetch()}
          />
        ) : null}

        {!list.isLoading && !list.isError && items.length === 0 ? (
          <div
            data-hp-stagger
            className="rounded-2xl border border-dashed border-[var(--hp-panel-border)] bg-[var(--bg-elevated)] px-6 py-12 text-center text-sm text-[var(--muted-strong)]"
          >
            No collections yet. Admin uploads appear here automatically.
          </div>
        ) : null}

        {items.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {items.map((set) => (
              <li key={set.id} data-hp-stagger className="min-w-0">
                <Link
                  href={`/preli-question-bank/${set.id}`}
                  className="group flex h-full min-h-[9.5rem] flex-col rounded-2xl border border-[var(--hp-panel-border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--hp-shadow)] ring-1 ring-black/[0.03] transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--ink)_12%,var(--line))] hover:shadow-[var(--hp-shadow-hover)] sm:p-6"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--hp-panel-border)] bg-[var(--bg-muted)] text-[var(--ink-soft)] transition-[border-color,background-color,color] duration-200 group-hover:border-[color-mix(in_srgb,var(--highlight)_22%,var(--line))] group-hover:bg-[var(--highlight-soft)] group-hover:text-[var(--highlight)]">
                    <FolderOpen className="h-4 w-4" aria-hidden />
                  </span>

                  <h3 className="mt-4 line-clamp-3 font-display text-[0.975rem] font-semibold tracking-tight text-[var(--ink)] transition-colors duration-200 group-hover:text-[var(--highlight)] sm:text-base">
                    {set.title}
                  </h3>

                  <p className="mt-auto flex items-center gap-2 pt-4 text-xs font-medium text-[var(--muted)] sm:text-[0.8125rem]">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="min-w-0 truncate">{formatUploadDate(set.uploadedAt)}</span>
                    <ArrowRight
                      className="ml-auto h-4 w-4 shrink-0 text-[var(--muted)] opacity-0 transition-[opacity,transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--highlight)] group-hover:opacity-100"
                      aria-hidden
                    />
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </HomepageReveal>
    </section>
  );
}
