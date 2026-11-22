'use client';

import Link from 'next/link';
import type { HomepagePayload } from '@your-academy/shared';
import type { PublicPlatformStats } from '@/lib/api/public-stats';
import {
  HomepageCountUp,
  HomepageReveal,
} from '@/components/marketing/homepage-gsap';

type Props = {
  stats: PublicPlatformStats | null;
  content?: HomepagePayload['liveStats'];
};

const ITEMS = [
  {
    key: 'questions' as const,
    label: 'Published MCQs',
    href: '/preli-question-bank',
  },
  {
    key: 'questionSets' as const,
    label: 'Collections',
    href: '/preli-question-bank',
  },
  {
    key: 'categories' as const,
    label: 'Exam categories',
    href: '/question-bank-categories',
  },
  {
    key: 'documents' as const,
    label: 'Newspaper columns',
    href: '/news',
  },
];

/** Verified platform counts from the API — never fabricated. */
export function HomepageLiveStats({ stats, content }: Props) {
  const heading = content?.heading?.trim() || 'Live platform library';
  return (
    <section
      id="platform-stats"
      aria-labelledby="stats-heading"
      className="hp-section hp-section-tone"
    >
      <HomepageReveal className="marketing-container" staggerChildren>
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <div className="max-w-md space-y-3" data-hp-stagger>
            <span className="hp-mark" aria-hidden />
            <h2 id="stats-heading" className="hp-heading text-[1.5rem] sm:text-[1.85rem]">
              {heading}
            </h2>
            <p className="hp-lede text-sm sm:text-[0.975rem]">
              Live counts from published content — not marketing estimates.
            </p>
          </div>

          <dl className="grid flex-1 grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-4 sm:gap-x-10">
            {ITEMS.map((item) => {
              const raw = stats?.[item.key];
              return (
                <div key={item.key} data-hp-stagger className="min-w-0">
                  <dt className="text-[0.7rem] font-medium tracking-[0.04em] text-[var(--muted)]">
                    {item.label}
                  </dt>
                  <dd className="mt-1.5 font-display text-[1.9rem] font-bold tracking-tight text-[var(--ink)] sm:text-[2.15rem]">
                    <Link
                      href={item.href}
                      className="transition-colors hover:text-[var(--highlight)]"
                    >
                      {raw == null ? (
                        <span className="tabular-nums" aria-label="Count unavailable">
                          —
                        </span>
                      ) : (
                        <HomepageCountUp value={raw} />
                      )}
                    </Link>
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </HomepageReveal>
    </section>
  );
}
