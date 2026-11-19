'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { HomepageIconKey, HomepagePayload } from '@your-academy/shared';
import { isHomepageOthersTile } from '@your-academy/shared';
import { Reveal } from '@/components/motion/reveal';
import { DirectoryPageShell } from '@/components/marketing/directory-page-shell';
import { DirectoryTileGridSkeleton } from '@/components/marketing/directory-tile-grid-skeleton';
import { HomepageTileCard } from '@/components/marketing/homepage-tile-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchField } from '@/components/ui/search-field';
import { SkeletonRegion } from '@/components/ui/skeleton';
import {
  fetchPublicCategories,
  publicCategoriesQueryKey,
} from '@/lib/api/categories';
import {
  categoryTileHref,
  dbCategoryHref,
  dbSubcategoryHref,
  guessHomepageIconKey,
  matchCategoryTile,
} from '@/lib/homepage-tile-links';

type Props = {
  heading: string;
  subtitle?: string;
  /** Published homepage tiles — logos/icons + any CMS-only titles. */
  tiles: HomepagePayload['categories']['tiles'];
};

type DirectoryCard = {
  key: string;
  href: string;
  title: string;
  subtitle?: string;
  iconKey: HomepageIconKey;
  logoUrl?: string | null;
};

/**
 * Full Target Exam Categories catalog — same HomepageTileCard chrome as the
 * homepage strip, including the Top 4 preview tiles (not Others-only).
 */
export function QuestionBankCategoriesDirectory({ heading, subtitle, tiles }: Props) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const cmsTiles = useMemo(
    () => tiles.filter((t) => t.visible && !isHomepageOthersTile(t)),
    [tiles],
  );

  const tree = useQuery({
    queryKey: publicCategoriesQueryKey('PRELIMINARY'),
    queryFn: () => fetchPublicCategories('PRELIMINARY'),
    staleTime: 60_000,
  });

  const roots = tree.data ?? [];

  const cards = useMemo(() => {
    const items: DirectoryCard[] = [];
    const coveredIds = new Set<string>();
    const coveredNames = new Set<string>();

    const markName = (name: string) => {
      coveredNames.add(name.trim().toLowerCase());
    };

    // CMS tiles first (preserves Top 4 + library order, including homepage logos).
    for (const tile of cmsTiles) {
      items.push({
        key: `cms:${tile.id}`,
        href: categoryTileHref(tile),
        title: tile.displayTitle,
        subtitle: tile.subtitle || undefined,
        iconKey: tile.iconKey,
        logoUrl: tile.logoUrl,
      });
      markName(tile.displayTitle);
      if (tile.subcategoryId) coveredIds.add(`sub:${tile.subcategoryId}`);
      if (tile.categoryId && !tile.subcategoryId) {
        coveredIds.add(`cat:${tile.categoryId}`);
        // Legacy: categoryId sometimes stored the child id.
        coveredIds.add(`sub:${tile.categoryId}`);
      }
      if (tile.categoryId && tile.subcategoryId) {
        coveredIds.add(`sub:${tile.subcategoryId}`);
      }
    }

    // Remaining live taxonomy nodes so the page is a complete DB list.
    for (const root of roots) {
      const rootNameKey = root.name.trim().toLowerCase();
      if (!coveredIds.has(`cat:${root.id}`) && !coveredNames.has(rootNameKey)) {
        const tile = matchCategoryTile(cmsTiles, {
          categoryId: root.id,
          name: root.name,
        });
        items.push({
          key: `cat:${root.id}`,
          href: dbCategoryHref(root.id),
          title: root.name,
          subtitle: root.description ?? undefined,
          iconKey: tile?.iconKey ?? guessHomepageIconKey(root.name),
          logoUrl: tile?.logoUrl,
        });
        coveredIds.add(`cat:${root.id}`);
        markName(root.name);
      }

      for (const child of root.children ?? []) {
        const childNameKey = child.name.trim().toLowerCase();
        if (coveredIds.has(`sub:${child.id}`) || coveredNames.has(childNameKey)) continue;
        const tile = matchCategoryTile(cmsTiles, {
          categoryId: root.id,
          subcategoryId: child.id,
          name: child.name,
        });
        items.push({
          key: `sub:${child.id}`,
          href: dbSubcategoryHref(root.id, child.id),
          title: child.name,
          subtitle: child.description ?? root.name,
          iconKey: tile?.iconKey ?? guessHomepageIconKey(child.name),
          logoUrl: tile?.logoUrl,
        });
        coveredIds.add(`sub:${child.id}`);
        markName(child.name);
      }
    }

    return items;
  }, [cmsTiles, roots]);

  const filtered = useMemo(() => {
    if (!q) return cards;
    return cards.filter(
      (card) =>
        card.title.toLowerCase().includes(q) ||
        (card.subtitle?.toLowerCase().includes(q) ?? false),
    );
  }, [cards, q]);

  const hasCms = cmsTiles.length > 0;
  const waitingOnTree = tree.isLoading;

  return (
    <DirectoryPageShell
      heading={heading}
      subtitle={subtitle}
      breadcrumbLabel="Target Exam Categories"
      backLabel="Back to homepage"
    >
      {!hasCms && !waitingOnTree && roots.length === 0 && !tree.isError ? (
        <EmptyState
          align="center"
          title="No categories yet"
          description="When exam categories are published in the question bank, they will appear here."
        />
      ) : (
        <div className="space-y-6">
          {hasCms || waitingOnTree || roots.length > 0 ? (
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Search categories…"
              aria-label="Search categories"
              variant="pill"
              className="max-w-md"
            />
          ) : null}

          <SkeletonRegion
            loading={waitingOnTree && !hasCms}
            label="Loading categories"
            fallback={<DirectoryTileGridSkeleton count={12} />}
          >
            {tree.isError && !hasCms ? (
              <EmptyState
                align="center"
                title="Couldn’t load categories"
                description="Check your connection and try again."
                action={
                  <Button type="button" variant="secondary" onClick={() => void tree.refetch()}>
                    Retry
                  </Button>
                }
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                align="center"
                title="No matches"
                description="Try a different search term."
              />
            ) : (
              <Reveal>
                <ul className="motion-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-4 xl:grid-cols-6">
                  {filtered.map((card) => (
                    <li key={card.key}>
                      <HomepageTileCard
                        href={card.href}
                        title={card.title}
                        subtitle={card.subtitle}
                        iconKey={card.iconKey}
                        logoUrl={card.logoUrl}
                      />
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}
          </SkeletonRegion>
        </div>
      )}
    </DirectoryPageShell>
  );
}
