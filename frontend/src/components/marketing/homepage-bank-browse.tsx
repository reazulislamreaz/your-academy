'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import {
  HOMEPAGE_EDITABLE_PREVIEW_SLOTS,
  createDefaultOthersCategoryTile,
  createDefaultOthersTopicTile,
  isHomepageOthersTile,
  splitHomepageSectionTiles,
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

type CategoriesProps = { categories: HomepagePayload['categories'] };
type TopicsProps = { topics: HomepagePayload['topics'] };

export function HomepageBankBrowseCategories({ categories }: CategoriesProps) {
  const categorySplit = splitHomepageSectionTiles(categories.tiles);
  const previewCategories = categorySplit.top
    .filter((t) => t.visible && !isHomepageOthersTile(t))
    .slice(0, HOMEPAGE_EDITABLE_PREVIEW_SLOTS);
  const categoriesOthers =
    categorySplit.others ??
    createDefaultOthersCategoryTile(categories.cta.href || QUESTION_BANK_CATEGORIES_PATH);
  const categoriesCtaHref = categories.cta.href || QUESTION_BANK_CATEGORIES_PATH;
  const categoriesOthersHref =
    categoriesOthers.fallbackHref || QUESTION_BANK_CATEGORIES_PATH;

  if (!categories.visible) return null;

  return (
    <section className="section-pad">
      <Reveal className="marketing-container grid items-center gap-6 sm:gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,2.2fr)] lg:gap-10">
        <div className="space-y-3 sm:space-y-4">
          <span
            className="mb-1 block h-[3px] w-7 rounded-full bg-[var(--highlight)]"
            aria-hidden
          />
          <h2 className="font-display text-[1.375rem] font-bold tracking-tight text-[var(--ink)] sm:text-2xl md:text-[2rem]">
            {categories.heading}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--muted-strong)] sm:text-base">
            {categories.subtitle}
          </p>
          {categories.cta.visible ? (
            <Link href={categoriesCtaHref} className="inline-flex w-full pt-1 sm:w-auto">
              <Button className="min-h-11 w-full rounded-full px-6 shadow-sm sm:w-auto">
                {categories.cta.label}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : null}
        </div>
        <ul className="motion-stagger grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6 lg:gap-4">
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
            <HomepageOthersTile
              href={categoriesOthersHref}
              title={categoriesOthers.displayTitle}
              logoUrl={categoriesOthers.logoUrl}
              iconKey={categoriesOthers.iconKey}
            />
          </li>
        </ul>
      </Reveal>
    </section>
  );
}

export function HomepageBankBrowseTopics({ topics }: TopicsProps) {
  const categoryTree = useQuery({
    queryKey: ['categories', 'public'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories', { skipRefresh: true }),
    staleTime: 60_000,
  });
  const roots = categoryTree.data ?? [];
  const topicSplit = splitHomepageSectionTiles(topics.tiles);
  const previewTopics = topicSplit.top
    .filter((t) => t.visible && !isHomepageOthersTile(t))
    .slice(0, HOMEPAGE_EDITABLE_PREVIEW_SLOTS);
  const topicsOthers =
    topicSplit.others ??
    createDefaultOthersTopicTile(topics.cta.href || ALL_TOPICS_PATH);
  const topicsCtaHref = topics.cta.href || ALL_TOPICS_PATH;
  const topicsOthersHref = topicsOthers.fallbackHref || ALL_TOPICS_PATH;

  if (!topics.visible) return null;

  return (
    <section className="pb-[var(--space-section)]">
      <Reveal className="marketing-container">
        <div className="rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--info-soft)] px-3.5 py-6 shadow-[var(--shadow-sm)] sm:px-8 sm:py-8">
          <div className="grid items-center gap-6 sm:gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,2.2fr)] lg:gap-10">
            <div className="space-y-3 sm:space-y-4">
              <span
                className="mb-1 block h-[3px] w-7 rounded-full bg-[var(--highlight)]"
                aria-hidden
              />
              <h2 className="font-display text-[1.375rem] font-bold tracking-tight text-[var(--ink)] sm:text-2xl md:text-[2rem]">
                {topics.heading}
              </h2>
              {topics.cta.visible ? (
                <Link href={topicsCtaHref} className="inline-flex w-full pt-1 sm:w-auto">
                  <Button className="min-h-11 w-full rounded-full px-6 shadow-sm sm:w-auto">
                    {topics.cta.label}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : null}
            </div>
            {previewTopics.length === 0 ? (
              <div className="space-y-3">
                <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-5 text-center text-sm text-[var(--muted-strong)] sm:px-5 sm:py-6">
                  No topics published yet. Admins add topics in Topic Based Question Analysis —
                  general categories are not listed here automatically.
                </p>
                <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
                  <li>
                    <HomepageOthersTile
                      href={topicsOthersHref}
                      title={topicsOthers.displayTitle}
                      logoUrl={topicsOthers.logoUrl}
                      iconKey={topicsOthers.iconKey}
                    />
                  </li>
                </ul>
              </div>
            ) : (
              <ul className="motion-stagger grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6 lg:gap-4">
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
                  <HomepageOthersTile
                    href={topicsOthersHref}
                    title={topicsOthers.displayTitle}
                    logoUrl={topicsOthers.logoUrl}
                    iconKey={topicsOthers.iconKey}
                  />
                </li>
              </ul>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/** Combined categories + topics (admin preview / legacy). */
export function HomepageBankBrowse({
  categories,
  topics,
}: {
  categories: HomepagePayload['categories'];
  topics: HomepagePayload['topics'];
}) {
  return (
    <>
      <HomepageBankBrowseCategories categories={categories} />
      <HomepageBankBrowseTopics topics={topics} />
    </>
  );
}
