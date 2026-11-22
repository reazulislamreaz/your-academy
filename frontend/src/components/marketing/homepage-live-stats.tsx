'use client';

import type { CSSProperties } from 'react';
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

  return (
    <section
      id="platform-stats"
      aria-labelledby="stats-heading"
      className="hp-section hp-section-tone hp-library-pair-top"
    >
      <HomepageReveal className="marketing-container" staggerChildren>
        <div className="hp-library-band relative z-[1] p-5 sm:p-7 lg:p-8" data-hp-stagger>
          <div className="relative z-[1] flex flex-col gap-8 lg:gap-10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
              <div className="max-w-xl space-y-3">
                <div className="flex items-center gap-3">
                  <span className="hp-mark mb-0" aria-hidden />
                  <span className="hp-live-badge" aria-live="polite">
                    <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
                      <span className="hp-live-ping absolute inline-flex h-full w-full rounded-full bg-[var(--highlight)] opacity-45" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--highlight)]" />
                    </span>
                    Live data
                  </span>
                </div>
                <h2
                  id="stats-heading"
                  className="hp-heading text-[1.5rem] sm:text-2xl md:text-[1.9rem]"
                >
                  {heading}
                </h2>
                <p className="hp-lede text-sm sm:text-[0.975rem]">
                  Live counts from published content — not marketing estimates.
                </p>
              </div>
            </div>

            <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {ITEMS.map((item, index) => {
                const raw = stats?.[item.key];
                const Icon = item.Icon;
                const delayStyle = {
                  '--hp-stat-delay': `${index * 0.35}s`,
                } as CSSProperties;

                return (
                  <li key={item.key} data-hp-stagger className="min-w-0" style={delayStyle}>
                    <Link href={item.href} className="hp-stat-card group block h-full p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <span className="hp-icon-chip h-10 w-10">
                          <Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden />
                        </span>
                        <span className="hp-stat-signal" aria-hidden />
                      </div>

                      <p className="mt-4 text-[0.7rem] font-semibold tracking-[0.04em] text-[var(--muted)]">
                        {item.label}
                      </p>
                      <p className="mt-1.5 font-display text-[1.85rem] font-bold tracking-tight text-[var(--ink)] transition-colors duration-200 group-hover:text-[var(--highlight)] sm:text-[2.15rem]">
                        {raw == null ? (
                          <span className="tabular-nums" aria-label="Count unavailable">
                            —
                          </span>
                        ) : (
                          <HomepageCountUp value={raw} />
                        )}
                      </p>
                      <span className="hp-stat-bar" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </HomepageReveal>
    </section>
  );
}
