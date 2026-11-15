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

type Props = {
  categories: HomepagePayload['categories'];
  topics: HomepagePayload['topics'];
};

function categoryHref(tile: HomepagePayload['categories']['tiles'][number]): string {
  return tile.categoryId
    ? `/preli-question-bank?categoryId=${encodeURIComponent(tile.categoryId)}`
    : tile.fallbackHref;
}

function topicHref(
  tile: HomepagePayload['topics']['tiles'][number],
  roots: CategoryNode[],
): string {
  if (tile.categoryId && tile.subcategoryId) {
    return `/preli-question-bank?categoryId=${encodeURIComponent(tile.categoryId)}&subcategoryId=${encodeURIComponent(tile.subcategoryId)}`;
  }
  if (tile.categoryId) {
    return `/preli-question-bank?categoryId=${encodeURIComponent(tile.categoryId)}`;
  }
  if (tile.subcategoryId) {
    for (const root of roots) {
      if (root.children.some((c) => c.id === tile.subcategoryId)) {
        return `/preli-question-bank?categoryId=${encodeURIComponent(root.id)}&subcategoryId=${encodeURIComponent(tile.subcategoryId)}`;
      }
    }
  }
  return tile.fallbackHref;
}

export function HomepageBankBrowse({ categories, topics }: Props) {
  const categoryTree = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories', { skipRefresh: true }),
    staleTime: 60_000,
  });

  const roots = categoryTree.data ?? [];
  const visibleCategories = categories.tiles.filter((t) => t.visible);
  const visibleTopics = topics.tiles.filter((t) => t.visible);
  const previewCategories = visibleCategories.slice(0, HOMEPAGE_SECTION_PREVIEW_LIMIT);
  const previewTopics = visibleTopics.slice(0, HOMEPAGE_SECTION_PREVIEW_LIMIT);
  const categoriesOthersHref = categories.cta.href || '/question-bank-categories';
  const topicsOthersHref = topics.cta.href || '/topic-categories';

  return (
    <>
      {categories.visible ? (
        <section className="section-pad">
          <Reveal className="mx-auto grid w-full max-w-[1280px] items-center gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,2.2fr)] lg:gap-10">
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
                <Link href={categoriesOthersHref} className="inline-flex pt-1">
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
                    href={categoryHref(tile)}
                    title={tile.displayTitle}
                    subtitle={tile.subtitle}
                    iconKey={tile.iconKey}
                    logoUrl={tile.logoUrl}
                  />
                </li>
              ))}
              <li>
                <HomepageOthersTile href={categoriesOthersHref} />
              </li>
            </ul>
          </Reveal>
        </section>
      ) : null}

      {topics.visible ? (
        <section className="pb-[var(--space-section)]">
          <Reveal className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
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
                    <Link href={topicsOthersHref} className="inline-flex pt-1">
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
                        href={topicHref(tile, roots)}
                        title={tile.displayTitle}
                        iconKey={tile.iconKey}
                        logoUrl={tile.logoUrl}
                      />
                    </li>
                  ))}
                  <li>
                    <HomepageOthersTile href={topicsOthersHref} />
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
