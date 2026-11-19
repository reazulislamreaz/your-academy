'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { HOMEPAGE_EDITABLE_PREVIEW_SLOTS } from '@your-academy/shared';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/reveal';
import {
  HomepageOthersTile,
  HomepageTileCard,
} from '@/components/marketing/homepage-tile-card';
import {
  fetchPublicCategories,
  flattenSubcategories,
  publicCategoriesQueryKey,
} from '@/lib/api/categories';
import {
  WRITTEN_SUBCATEGORIES_PATH,
  guessHomepageIconKey,
  writtenSubcategoryHref,
} from '@/lib/homepage-tile-links';

const HEADING = 'Written exam categories';
const SUBTITLE = 'Browse the Written bank by the exams you are preparing for';
const CTA_LABEL = 'View all categories';

/**
 * Homepage strip for Written Question Bank subcategories —
 * same two-column chrome as Preliminary “Target exam categories”
 * (Top 4 live WRITTEN subs + dashed Others).
 */
export function HomepageWrittenSubcategories() {
  const tree = useQuery({
    queryKey: publicCategoriesQueryKey('WRITTEN'),
    queryFn: () => fetchPublicCategories('WRITTEN'),
    staleTime: 60_000,
  });

  const allSubs = flattenSubcategories(tree.data ?? []);
  const preview = allSubs.slice(0, HOMEPAGE_EDITABLE_PREVIEW_SLOTS);

  return (
    <section className="section-pad pt-0" aria-labelledby="written-exam-categories-heading">
      <Reveal className="marketing-container grid items-center gap-6 sm:gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,2.2fr)] lg:gap-10">
        <div className="space-y-3 sm:space-y-4">
          <span className="hp-mark" aria-hidden />
          <h2
            id="written-exam-categories-heading"
            className="hp-heading text-[1.375rem] sm:text-2xl md:text-[2rem]"
          >
            {HEADING}
          </h2>
          <p className="hp-lede text-sm sm:text-base">{SUBTITLE}</p>
          <Link href={WRITTEN_SUBCATEGORIES_PATH} className="inline-flex w-full pt-1 sm:w-auto">
            <Button className="min-h-11 w-full rounded-full px-6 shadow-[0_10px_24px_-12px_rgba(227,30,36,0.45)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 sm:w-auto">
              {CTA_LABEL}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {tree.isLoading ? (
          <ul className="motion-stagger grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6 lg:gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i}>
                <div
                  className="min-h-[7.25rem] animate-pulse rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-muted)] sm:min-h-[8.5rem]"
                  aria-hidden
                />
              </li>
            ))}
          </ul>
        ) : preview.length === 0 ? (
          <div className="space-y-3">
            <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-5 text-center text-sm text-[var(--muted-strong)] sm:px-5 sm:py-6">
              No Written subcategories yet. Admins add them under Written bank categories — use
              Others to browse anytime.
            </p>
            <ul className="motion-stagger grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6 lg:gap-4">
              <li>
                <HomepageOthersTile href={WRITTEN_SUBCATEGORIES_PATH} title="Others" />
              </li>
            </ul>
          </div>
        ) : (
          <ul className="motion-stagger grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6 lg:gap-4">
            {preview.map((sub) => (
              <li key={sub.id}>
                <HomepageTileCard
                  href={writtenSubcategoryHref(sub.id, sub.parentId)}
                  title={sub.name}
                  subtitle={sub.label.includes(' · ') ? sub.label.split(' · ')[0] : undefined}
                  iconKey={guessHomepageIconKey(sub.name)}
                />
              </li>
            ))}
            <li>
              <HomepageOthersTile href={WRITTEN_SUBCATEGORIES_PATH} title="Others" />
            </li>
          </ul>
        )}
      </Reveal>
    </section>
  );
}
