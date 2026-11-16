'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import {
  HOMEPAGE_SECTION_PREVIEW_LIMIT,
  type HomepagePayload,
} from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/reveal';
import {
  HomepageOthersTile,
  HomepageTileCard,
} from '@/components/marketing/homepage-tile-card';
import { apiFetch } from '@/lib/api/client';
import type { CategoryNode } from '@/lib/api/types';
import {
  ALL_TOPICS_PATH,
  QUESTION_BANK_CATEGORIES_PATH,
  categoryTileHref,
  topicTileHref,
} from '@/lib/homepage-tile-links';

type Props = {
  categories: HomepagePayload['categories'];
  topics: HomepagePayload['topics'];
};

export function HomepageBankBrowse({ categories, topics }: Props) {
  const categoryTree = useQuery({
    queryKey: ['categories', 'public'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories', { skipRefresh: true }),
    staleTime: 60_000,
  });

  const roots = categoryTree.data ?? [];
  const visibleCategories = categories.tiles.filter(
    (t) => t.visible && t.displayTitle.trim().toLowerCase() !== 'others',
  );
  const visibleTopics = topics.tiles.filter(
    (t) => t.visible && t.displayTitle.trim().toLowerCase() !== 'others',
  );
  const previewCategories = visibleCategories.slice(0, HOMEPAGE_SECTION_PREVIEW_LIMIT);
  const previewTopics = visibleTopics.slice(0, HOMEPAGE_SECTION_PREVIEW_LIMIT);
  // CTA may point at the question bank; Others always opens the full directory pages.
  const categoriesCtaHref = categories.cta.href || QUESTION_BANK_CATEGORIES_PATH;
  const topicsCtaHref = topics.cta.href || ALL_TOPICS_PATH;

  return (
    <>
      {categories.visible ? (
        <section className="section-pad">
          <Reveal className="marketing-container grid items-center gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,2.2fr)] lg:gap-10">
            <div className="space-y-4">
              <span
                className="mb-1 block h-[3px] w-7 rounded-full bg-[var(--highlight)]"
                aria-hidden
              />
              <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-[2rem]">
                {categories.heading}
              </h2>
              <p className="text-[var(--muted-strong)]">{categories.subtitle}</p>
              {categories.cta.visible ? (
                <Link href={categoriesCtaHref} className="inline-flex pt-1">
                  <Button className="rounded-full px-6 shadow-sm">
                    {categories.cta.label}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : null}
            </div>
            <ul className="motion-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
              {previewCategories.map((tile) => (
                <li key={tile.id}>
                  <HomepageTileCard
                    href={categoryTileHref(tile)}
                    title={tile.displayTitle}
                    subtitle={tile.subtitle}
                    iconKey={tile.iconKey}
                    logoUrl={tile.logoUrl}
                  />
                </li>
              ))}
              <li>
                <HomepageOthersTile href={QUESTION_BANK_CATEGORIES_PATH} />
              </li>
            </ul>
          </Reveal>
        </section>
      ) : null}

      {topics.visible ? (
        <section className="pb-[var(--space-section)]">
          <Reveal className="marketing-container">
            <div className="rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--info-soft)] px-5 py-7 shadow-[var(--shadow-sm)] sm:px-8 sm:py-8">
              <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,2.2fr)] lg:gap-10">
                <div className="space-y-4">
                  <span
                    className="mb-1 block h-[3px] w-7 rounded-full bg-[var(--highlight)]"
                    aria-hidden
                  />
                  <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-[2rem]">
                    {topics.heading}
                  </h2>
                  {topics.cta.visible ? (
                    <Link href={topicsCtaHref} className="inline-flex pt-1">
                      <Button className="rounded-full px-6 shadow-sm">
                        {topics.cta.label}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : null}
                </div>
                <ul className="motion-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
                  {previewTopics.map((tile) => (
                    <li key={tile.id}>
                      <HomepageTileCard
                        href={topicTileHref(tile, roots)}
                        title={tile.displayTitle}
                        iconKey={tile.iconKey}
                        logoUrl={tile.logoUrl}
                      />
                    </li>
                  ))}
                  <li>
                    <HomepageOthersTile href={ALL_TOPICS_PATH} />
                  </li>
                </ul>
              </div>
            </div>
          </Reveal>
        </section>
      ) : null}
    </>
  );
}
