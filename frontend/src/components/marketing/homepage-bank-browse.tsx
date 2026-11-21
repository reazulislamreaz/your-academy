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
import {
  fetchPublicCategories,
  publicCategoriesQueryKey,
} from '@/lib/api/categories';
import {
  ALL_TOPICS_PATH,
  QUESTION_BANK_CATEGORIES_PATH,
  WRITTEN_SUBCATEGORIES_PATH,
  categoryTileHref,
  guessHomepageIconKey,
  topicBaseHref,
  writtenCategoryTileHref,
} from '@/lib/homepage-tile-links';

type CategoriesProps = { categories: HomepagePayload['categories'] };
type WrittenCategoriesProps = {
  writtenCategories: HomepagePayload['writtenCategories'];
};
type TopicsProps = { topics: HomepagePayload['topics'] };

export function HomepageBankBrowseCategories({ categories }: CategoriesProps) {
  const categorySplit = splitHomepageSectionTiles(categories.tiles);
  const previewCategories = categorySplit.top
    .filter((t) => t.visible && !isHomepageOthersTile(t))
    .slice(0, HOMEPAGE_EDITABLE_PREVIEW_SLOTS);
  const categoriesOthers =
    categorySplit.others ??
    createDefaultOthersCategoryTile(QUESTION_BANK_CATEGORIES_PATH);
  const categoriesCtaHref = categories.cta.href || QUESTION_BANK_CATEGORIES_PATH;
  // Others always opens the full categories directory (not a filtered "rest-only" list).
  const categoriesOthersHref = QUESTION_BANK_CATEGORIES_PATH;

  if (!categories.visible) return null;

  return (
    <section className="section-pad" aria-labelledby="preli-exam-categories-heading">
      <Reveal className="marketing-container grid items-center gap-6 sm:gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,2.2fr)] lg:gap-10">
        <div className="space-y-3 sm:space-y-4">
          <span className="hp-mark" aria-hidden />
          <h2
            id="preli-exam-categories-heading"
            className="hp-heading text-[1.375rem] sm:text-2xl md:text-[2rem]"
          >
            {categories.heading}
          </h2>
          <p className="hp-lede text-sm sm:text-base">{categories.subtitle}</p>
          {categories.cta.visible ? (
            <Link href={categoriesCtaHref} className="inline-flex w-full pt-1 sm:w-auto">
              <Button className="min-h-11 w-full rounded-full px-6 shadow-[0_10px_24px_-12px_rgba(227,30,36,0.45)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 sm:w-auto">
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

/** Published Written Top 4 + locked Others — never mixes Preliminary tiles. */
export function HomepageBankBrowseWrittenCategories({
  writtenCategories,
}: WrittenCategoriesProps) {
  const split = splitHomepageSectionTiles(writtenCategories.tiles);
  const preview = split.top
    .filter((t) => t.visible && !isHomepageOthersTile(t))
    .slice(0, HOMEPAGE_EDITABLE_PREVIEW_SLOTS);
  const others =
    split.others ?? createDefaultOthersCategoryTile(WRITTEN_SUBCATEGORIES_PATH);
  const ctaHref = writtenCategories.cta.href || WRITTEN_SUBCATEGORIES_PATH;
  const othersHref = WRITTEN_SUBCATEGORIES_PATH;

  if (!writtenCategories.visible) return null;

  return (
    <section className="section-pad pt-0" aria-labelledby="written-exam-categories-heading">
      <Reveal className="marketing-container grid items-center gap-6 sm:gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,2.2fr)] lg:gap-10">
        <div className="space-y-3 sm:space-y-4">
          <span className="hp-mark" aria-hidden />
          <h2
            id="written-exam-categories-heading"
            className="hp-heading text-[1.375rem] sm:text-2xl md:text-[2rem]"
          >
            {writtenCategories.heading}
          </h2>
          <p className="hp-lede text-sm sm:text-base">{writtenCategories.subtitle}</p>
          {writtenCategories.cta.visible ? (
            <Link href={ctaHref} className="inline-flex w-full pt-1 sm:w-auto">
              <Button className="min-h-11 w-full rounded-full px-6 shadow-[0_10px_24px_-12px_rgba(227,30,36,0.45)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 sm:w-auto">
                {writtenCategories.cta.label}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : null}
        </div>
        {preview.length === 0 ? (
          <div className="space-y-3">
            <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-5 text-center text-sm text-[var(--muted-strong)] sm:px-5 sm:py-6">
              No Written titles published yet. Admins promote Written categories in Written Bank
              Categories — use Others to browse anytime.
            </p>
            <ul className="motion-stagger grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6 lg:gap-4">
              <li>
                <HomepageOthersTile
                  href={othersHref}
                  title={others.displayTitle}
                  logoUrl={others.logoUrl}
                  iconKey={others.iconKey}
                />
              </li>
            </ul>
          </div>
        ) : (
          <ul className="motion-stagger grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6 lg:gap-4">
            {preview.map((tile) => (
              <li key={tile.id}>
                <HomepageTileCard
                  href={writtenCategoryTileHref(tile)}
                  title={tile.displayTitle}
                  subtitle={tile.subtitle}
                  iconKey={tile.iconKey}
                  logoUrl={tile.logoUrl}
                />
              </li>
            ))}
            <li>
              <HomepageOthersTile
                href={othersHref}
                title={others.displayTitle}
                logoUrl={others.logoUrl}
                iconKey={others.iconKey}
              />
            </li>
          </ul>
        )}
      </Reveal>
    </section>
  );
}

export function HomepageBankBrowseTopics({ topics }: TopicsProps) {
  const topicTree = useQuery({
    queryKey: publicCategoriesQueryKey('TOPIC'),
    queryFn: () => fetchPublicCategories('TOPIC'),
    staleTime: 60_000,
  });
  // Live TOPIC taxonomy only (DEC-042) — never fall back to CMS demo tiles.
  const roots = topicTree.data ?? [];
  const liveTopics = roots.flatMap((root) =>
    (root.children ?? []).map((child) => ({
      id: child.id,
      displayTitle: child.name,
      subtitle: root.name,
      iconKey: (child.iconKey ||
        root.iconKey ||
        guessHomepageIconKey(child.name)) as HomepagePayload['topics']['tiles'][number]['iconKey'],
      href: topicBaseHref(child.id),
    })),
  );
  const previewTopics = liveTopics.slice(0, HOMEPAGE_EDITABLE_PREVIEW_SLOTS);
  const topicSplit = splitHomepageSectionTiles(topics.tiles);
  const topicsOthers =
    topicSplit.others ?? createDefaultOthersTopicTile(ALL_TOPICS_PATH);
  const topicsCtaHref = ALL_TOPICS_PATH;
  const topicsOthersHref = ALL_TOPICS_PATH;

  if (!topics.visible) return null;

  return (
    <section className="section-pad pt-0" aria-labelledby="topic-analysis-heading">
      <Reveal className="marketing-container grid items-center gap-6 sm:gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,2.2fr)] lg:gap-10">
        <div className="space-y-3 sm:space-y-4">
          <span className="hp-mark" aria-hidden />
          <h2
            id="topic-analysis-heading"
            className="hp-heading text-[1.375rem] sm:text-2xl md:text-[2rem]"
          >
            {topics.heading}
          </h2>
          {topics.subtitle.trim() ? (
            <p className="hp-lede text-sm sm:text-base">{topics.subtitle}</p>
          ) : null}
          {topics.cta.visible ? (
            <Link href={topicsCtaHref} className="inline-flex w-full pt-1 sm:w-auto">
              <Button className="min-h-11 w-full rounded-full px-6 shadow-[0_10px_24px_-12px_rgba(227,30,36,0.45)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 sm:w-auto">
                {topics.cta.label}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : null}
        </div>
        {topicTree.isLoading ? (
          <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-5 text-center text-sm text-[var(--muted-strong)] sm:px-5 sm:py-6">
            Loading topics…
          </p>
        ) : previewTopics.length === 0 ? (
          <div className="space-y-3">
            <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-5 text-center text-sm text-[var(--muted-strong)] sm:px-5 sm:py-6">
              No topics yet. Admins add Topic Base categories and subcategories under Taxonomy →
              Topics — use Others to open the full directory anytime.
            </p>
            <ul className="motion-stagger grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6 lg:gap-4">
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
                  href={tile.href}
                  title={tile.displayTitle}
                  subtitle={tile.subtitle}
                  iconKey={tile.iconKey}
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
