'use client';

import { DEFAULT_LIVE_STAT_LABELS } from '@your-academy/shared';
import Link from 'next/link';
import { BookOpen, FolderTree, Layers, Newspaper, type LucideIcon } from 'lucide-react';
import type { HomepagePayload } from '@your-academy/shared';
import type { PublicPlatformStats } from '@/lib/api/public-stats';
import { HomepageCountUp, HomepageReveal } from '@/components/marketing/homepage-gsap';

type Props = {
  stats: PublicPlatformStats | null;
  content?: HomepagePayload['liveStats'];
};

type StatKey = 'questions' | 'questionSets' | 'categories' | 'documents';

const ITEMS: Array<{
  key: StatKey;
  label: string;
  href: string;
  Icon: LucideIcon;
}> = [
  {
    key: 'questions',
    label: 'Published MCQs',
    href: '/preli-question-bank',
    Icon: BookOpen,
  },
  {
    key: 'questionSets',
    label: 'Collections',
    href: '/preli-question-bank',
    Icon: Layers,
  },
  {
    key: 'categories',
    label: 'Exam categories',
    href: '/question-bank-categories',
    Icon: FolderTree,
  },
  {
    key: 'documents',
    label: 'Newspaper columns',
    href: '/news',
    Icon: Newspaper,
  },
];

/** Verified platform counts from the API — never fabricated. */
export function HomepageLiveStats({ stats, content }: Props) {
  const heading = content?.heading?.trim() || 'Live platform library';
  const eyebrow = content?.eyebrow?.trim() || 'Live data';
  const subtitle =
    content?.subtitle?.trim() ||
    'Live counts from published content — not marketing estimates.';

  return (
    <section
      id="platform-stats"
      aria-labelledby="stats-heading"
      className="hp-section hp-section-tone hp-library-pair-top"
    >
      <HomepageReveal className="marketing-container space-y-5 sm:space-y-6" staggerChildren>
        <div className="max-w-xl space-y-2" data-hp-stagger>
          <div className="flex flex-wrap items-center gap-2">
            <span className="hp-mark mb-0" aria-hidden />
            <span className="hp-live-badge" aria-live="polite">
              <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden>
                <span className="hp-live-ping absolute inline-flex h-full w-full rounded-full bg-[var(--highlight)] opacity-40" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--highlight)]" />
              </span>
              {eyebrow}
            </span>
          </div>
          <h2 id="stats-heading" className="hp-heading text-[1.25rem] sm:text-xl md:text-[1.65rem]">
            {heading}
          </h2>
          {subtitle ? <p className="hp-lede text-sm">{subtitle}</p> : null}
        </div>

        <ul className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {ITEMS.map((item) => {
            const raw = stats?.[item.key];
            const Icon = item.Icon;

            return (
              <li key={item.key} data-hp-stagger className="min-w-0">
                <Link
                  href={item.href}
                  className="hp-stat-card group flex h-full min-h-11 flex-col gap-2 p-3 sm:p-3.5"
                >
                  <span className="hp-icon-chip h-8 w-8">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[0.65rem] font-semibold leading-snug tracking-[0.03em] text-[var(--muted)] text-pretty">
                      {content?.labels?.[item.key as keyof typeof DEFAULT_LIVE_STAT_LABELS]?.trim() ||
                        item.label}
                    </p>
                    <p className="mt-0.5 font-display text-[1.35rem] font-bold tracking-tight text-[var(--ink)] transition-colors duration-200 group-hover:text-[var(--highlight)] sm:text-[1.5rem]">
                      {raw == null ? (
                        <span className="tabular-nums" aria-label="Count unavailable">
                          —
                        </span>
                      ) : (
                        <HomepageCountUp value={raw} />
                      )}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </HomepageReveal>
    </section>
  );
}
