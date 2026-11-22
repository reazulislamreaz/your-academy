'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  HOMEPAGE_EDITABLE_PREVIEW_SLOTS,
  createDefaultOthersCategoryTile,
  createDefaultOthersTopicTile,
  isHomepageOthersTile,
  splitHomepageSectionTiles,
  type HomepagePayload,
} from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { HomepageReveal } from '@/components/marketing/homepage-gsap';
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
  topicExplorerHref,
  writtenCategoryTileHref,
} from '@/lib/homepage-tile-links';
import { cn } from '@/lib/utils';

type CategoriesProps = { categories: HomepagePayload['categories'] };
type WrittenCategoriesProps = {
  writtenCategories: HomepagePayload['writtenCategories'];
};
type TopicsProps = { topics: HomepagePayload['topics'] };

function BankSectionShell({
  id,
  heading,
  subtitle,
  cta,
  ctaHref,
  children,
  className,
  toneLabel,
}: {
  id: string;
  heading: string;
  subtitle: string;
  cta: { label: string; visible: boolean };
  ctaHref: string;
  children: ReactNode;
  className?: string;
  toneLabel?: string;
}) {
  return (
    <section className={cn('hp-section', className)} aria-labelledby={id}>
      <HomepageReveal
        className="marketing-container grid items-start gap-8 sm:gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2.1fr)] lg:gap-12"
        staggerChildren
      >
        <div className="space-y-3.5 sm:space-y-4" data-hp-stagger>
          <span className="hp-mark" aria-hidden />
          {toneLabel ? (
            <p className="text-[0.68rem] font-semibold tracking-[0.11em] text-[var(--muted)] uppercase">
              {toneLabel}
            </p>
          ) : null}
          <h2 id={id} className="hp-heading text-[1.4rem] sm:text-2xl md:text-[1.85rem]">
            {heading}
          </h2>
          {subtitle.trim() ? (
            <p className="hp-lede text-sm sm:text-[0.975rem]">{subtitle}</p>
          ) : null}
          {cta.visible ? (
            <Link href={ctaHref} className="inline-flex w-full pt-1 sm:w-auto">
              <Button className="min-h-11 w-full rounded-full px-6 font-semibold shadow-[0_10px_28px_-14px_rgba(227,30,36,0.35)] sm:w-auto">
                {cta.label}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : null}
        </div>
        {children}
      </HomepageReveal>
    </section>
  );
}

export function HomepageBankBrowseCategories({ categories }: CategoriesProps) {
  const categorySplit = splitHomepageSectionTiles(categories.tiles);
  const previewCategories = categorySplit.top
    .filter((t) => t.visible && !isHomepageOthersTile(t))
    .slice(0, HOMEPAGE_EDITABLE_PREVIEW_SLOTS);
  const categoriesOthers =
    categorySplit.others ??
    createDefaultOthersCategoryTile(QUESTION_BANK_CATEGORIES_PATH);
  const categoriesCtaHref = categories.cta.href || QUESTION_BANK_CATEGORIES_PATH;
  const categoriesOthersHref = QUESTION_BANK_CATEGORIES_PATH;

  if (!categories.visible) return null;

  return (
    <BankSectionShell
      id="preli-exam-categories-heading"
      heading={categories.heading}
      subtitle={categories.subtitle}
      cta={categories.cta}
      ctaHref={categoriesCtaHref}
      toneLabel="Preliminary"
    >
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 xl:grid-cols-5">
        {previewCategories.map((tile) => (
          <li key={tile.id}>
            <HomepageTileCard
              href={categoryTileHref(tile)}
              title={tile.displayTitle}
              subtitle={tile.subtitle}
              iconKey={tile.iconKey}
              logoUrl={tile.logoUrl}
              tone="preli"
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
    </BankSectionShell>
  );
}

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
    <BankSectionShell
      id="written-exam-categories-heading"
      heading={writtenCategories.heading}
      subtitle={writtenCategories.subtitle}
      cta={writtenCategories.cta}
      ctaHref={ctaHref}
      className="hp-section-tone"
      toneLabel="Written"
    >
      {preview.length === 0 ? (
        <div className="space-y-3" data-hp-stagger>
          <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-5 text-sm text-[var(--muted-strong)]">
            No Written titles published yet. Admins promote Written categories in Written Bank
            Categories — use Others to browse anytime.
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 xl:grid-cols-5">
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
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 xl:grid-cols-5">
          {preview.map((tile) => (
            <li key={tile.id}>
              <HomepageTileCard
                href={writtenCategoryTileHref(tile)}
                title={tile.displayTitle}
                subtitle={tile.subtitle}
                iconKey={tile.iconKey}
                logoUrl={tile.logoUrl}
                tone="written"
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
    </BankSectionShell>
  );
}

export function HomepageBankBrowseTopics({ topics }: TopicsProps) {
  const topicTree = useQuery({
    queryKey: publicCategoriesQueryKey('TOPIC'),
    queryFn: () => fetchPublicCategories('TOPIC'),
    staleTime: 60_000,
  });
  const roots = topicTree.data ?? [];
  const previewTopics = roots.slice(0, HOMEPAGE_EDITABLE_PREVIEW_SLOTS).map((root) => ({
    id: root.id,
    displayTitle: root.name,
    subtitle:
      (root.children?.length ?? 0) > 0
        ? `${root.children!.length} subcategor${root.children!.length === 1 ? 'y' : 'ies'}`
        : 'Browse topics',
    iconKey: (root.iconKey ||
      guessHomepageIconKey(root.name)) as HomepagePayload['topics']['tiles'][number]['iconKey'],
    href: topicExplorerHref({ categoryId: root.id }),
  }));
  const topicSplit = splitHomepageSectionTiles(topics.tiles);
  const topicsOthers =
    topicSplit.others ?? createDefaultOthersTopicTile(ALL_TOPICS_PATH);
  const topicsCtaHref = ALL_TOPICS_PATH;
  const topicsOthersHref = ALL_TOPICS_PATH;

  if (!topics.visible) return null;

  const topicsLede =
    topics.subtitle.trim() ||
    topics.subheading?.trim() ||
    'Explore subject-wise questions and practice important topics to strengthen your knowledge and prepare more effectively for competitive exams.';

  return (
    <BankSectionShell
      id="topic-analysis-heading"
      heading={topics.heading}
      subtitle={topicsLede}
      cta={topics.cta}
      ctaHref={topicsCtaHref}
      toneLabel="Topic analysis"
    >
      {topicTree.isLoading ? (
        <p
          data-hp-stagger
          className="rounded-[var(--radius-lg)] border border-dashed border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-5 text-sm text-[var(--muted-strong)]"
        >
          Loading topics…
        </p>
      ) : previewTopics.length === 0 ? (
        <div className="space-y-3" data-hp-stagger>
          <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-5 text-sm text-[var(--muted-strong)]">
            No topic categories yet. Admins add Topic Base categories under Taxonomy → Topics —
            use Others to open the folder explorer anytime.
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 xl:grid-cols-5">
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
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 xl:grid-cols-5">
          {previewTopics.map((tile) => (
            <li key={tile.id}>
              <HomepageTileCard
                href={tile.href}
                title={tile.displayTitle}
                subtitle={tile.subtitle}
                iconKey={tile.iconKey}
                tone="topic"
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
    </BankSectionShell>
  );
}

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
