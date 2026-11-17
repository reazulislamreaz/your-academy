'use client';

import { useQuery } from '@tanstack/react-query';
import type { HomepagePayload } from '@your-academy/shared';
import { Reveal } from '@/components/motion/reveal';
import { DirectoryPageShell } from '@/components/marketing/directory-page-shell';
import { HomepageTileCard } from '@/components/marketing/homepage-tile-card';
import { EmptyState } from '@/components/ui/empty-state';
import { apiFetch } from '@/lib/api/client';
import type { CategoryNode } from '@/lib/api/types';
import { topicTileHref } from '@/lib/homepage-tile-links';

type Props = {
  heading?: string;
  subtitle?: string;
  /** Topic tiles from published homepage CMS (database-backed). */
  tiles: HomepagePayload['topics']['tiles'];
};

export function AllTopicsDirectory({
  heading = 'All Topics',
  subtitle = 'Browse every topic available for question analysis.',
  tiles,
}: Props) {
  const visibleTiles = tiles.filter(
    (t) => t.visible && t.displayTitle.trim().toLowerCase() !== 'others',
  );

  const tree = useQuery({
    queryKey: ['categories', 'public'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories', { skipRefresh: true }),
    staleTime: 60_000,
    enabled: visibleTiles.length > 0,
  });

  const roots = tree.data ?? [];

  return (
    <DirectoryPageShell heading={heading} subtitle={subtitle}>
      {visibleTiles.length === 0 ? (
        <EmptyState
          align="center"
          title="No topics yet"
          description="Only topics added by an admin in Topic Based Question Analysis appear here. General categories are never imported automatically."
        />
      ) : (
        <Reveal>
          <ul className="motion-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:gap-4">
            {visibleTiles.map((tile) => (
              <li key={tile.id}>
                <HomepageTileCard
                  href={topicTileHref(tile, roots)}
                  title={tile.displayTitle}
                  iconKey={tile.iconKey}
                  logoUrl={tile.logoUrl}
                />
              </li>
            ))}
          </ul>
        </Reveal>
      )}
    </DirectoryPageShell>
  );
}
