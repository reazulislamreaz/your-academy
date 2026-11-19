'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { HomepagePayload } from '@your-academy/shared';
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
import { topicTileHref, topicTileTaxonomyLabel } from '@/lib/homepage-tile-links';

type Props = {
  heading?: string;
  subtitle?: string;
  breadcrumbLabel?: string;
  /** Full published CMS topic catalog (Top 4 + library — not Others-only). */
  tiles: HomepagePayload['topics']['tiles'];
};

/**
 * Full topic catalog — same card chrome as the homepage Topics section,
 * showing every curated topic including the Top 4 homepage preview.
 * Linked from homepage Others → `/topic-categories`.
 */
export function AllTopicsDirectory({
  heading = 'All Topics',
  subtitle = 'Browse every topic available for question analysis.',
  breadcrumbLabel = 'Topic Base Question Analysis',
  tiles,
}: Props) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  // Preserve CMS order: Top 4 first, then library tiles after Others.
  const visibleTiles = useMemo(
    () => tiles.filter((t) => t.visible && !isHomepageOthersTile(t)),
    [tiles],
  );

  const tree = useQuery({
    queryKey: publicCategoriesQueryKey('PRELIMINARY'),
    queryFn: () => fetchPublicCategories('PRELIMINARY'),
    staleTime: 60_000,
    enabled: visibleTiles.length > 0,
  });

  const roots = tree.data ?? [];

  const filtered = useMemo(() => {
    if (!q) return visibleTiles;
    return visibleTiles.filter((tile) => {
      const taxonomy = topicTileTaxonomyLabel(tile, roots)?.toLowerCase() ?? '';
      return tile.displayTitle.toLowerCase().includes(q) || taxonomy.includes(q);
    });
  }, [visibleTiles, q, roots]);

  const loadingHrefs = tree.isLoading && visibleTiles.length > 0;

  return (
    <DirectoryPageShell
      heading={heading}
      subtitle={subtitle}
      breadcrumbLabel={breadcrumbLabel}
      backLabel="Back to homepage"
    >
      {visibleTiles.length === 0 ? (
        <EmptyState
          align="center"
          title="No topics yet"
          description="Only topics added by an admin in Topic Base Question Analysis appear here."
        />
      ) : (
        <div className="space-y-6">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search topics…"
            aria-label="Search topics"
            variant="pill"
            className="max-w-md"
          />

          <SkeletonRegion
            loading={loadingHrefs}
            label="Loading topics"
            fallback={<DirectoryTileGridSkeleton count={12} />}
          >
            {tree.isError ? (
              <EmptyState
                align="center"
                title="Couldn’t load topics"
                description="Topic links need the category tree. Check your connection and try again."
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
                  {filtered.map((tile) => (
                    <li key={tile.id}>
                      <HomepageTileCard
                        href={topicTileHref(tile, roots)}
                        title={tile.displayTitle}
                        subtitle={topicTileTaxonomyLabel(tile, roots)}
                        iconKey={tile.iconKey}
                        logoUrl={tile.logoUrl}
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
