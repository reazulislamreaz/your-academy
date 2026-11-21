'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { HomepageIconKey } from '@your-academy/shared';
import { DirectoryPageShell } from '@/components/marketing/directory-page-shell';
import { DirectoryTileGridSkeleton } from '@/components/marketing/directory-tile-grid-skeleton';
import { HomepageTileCard } from '@/components/marketing/homepage-tile-card';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchField } from '@/components/ui/search-field';
import { SkeletonRegion } from '@/components/ui/skeleton';
import {
  fetchPublicCategories,
  publicCategoriesQueryKey,
} from '@/lib/api/categories';
import { guessHomepageIconKey, topicBaseHref } from '@/lib/homepage-tile-links';

type Props = {
  heading?: string;
  subtitle?: string;
  breadcrumbLabel?: string;
};

/**
 * Full topic catalog from live TOPIC taxonomy (DEC-042).
 * Linked from homepage Others → `/topic-categories`. No CMS/demo fallbacks.
 */
export function AllTopicsDirectory({
  heading = 'All Topics',
  subtitle = 'Browse every topic available for question analysis.',
  breadcrumbLabel = 'Topic Base Question Analysis',
}: Props) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const tree = useQuery({
    queryKey: publicCategoriesQueryKey('TOPIC'),
    queryFn: () => fetchPublicCategories('TOPIC'),
    staleTime: 60_000,
  });

  const roots = tree.data ?? [];
  const items = useMemo(
    () =>
      roots.flatMap((root) =>
        (root.children ?? []).map((child) => ({
          id: child.id,
          displayTitle: child.name,
          subtitle: root.name,
          iconKey: (child.iconKey ||
            root.iconKey ||
            guessHomepageIconKey(child.name)) as HomepageIconKey,
          href: topicBaseHref(child.id),
        })),
      ),
    [roots],
  );

  const filtered = useMemo(() => {
    if (!q) return items;
    return items.filter((tile) => {
      const sub = (tile.subtitle ?? '').toLowerCase();
      return tile.displayTitle.toLowerCase().includes(q) || sub.includes(q);
    });
  }, [items, q]);

  return (
    <DirectoryPageShell
      heading={heading}
      subtitle={subtitle}
      breadcrumbLabel={breadcrumbLabel}
      backLabel="Back to homepage"
    >
      {tree.isLoading ? (
        <SkeletonRegion loading label="Loading topics" fallback={<DirectoryTileGridSkeleton count={12} />}>
          <span className="sr-only">Loading</span>
        </SkeletonRegion>
      ) : tree.isError ? (
        <EmptyState
          align="center"
          title="Couldn’t load topics"
          description="Please refresh and try again."
        />
      ) : items.length === 0 ? (
        <EmptyState
          align="center"
          title="No topics yet"
          description="Admins create Topic Base categories under Taxonomy → Topics, then upload questions."
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

          {filtered.length === 0 ? (
            <EmptyState
              align="center"
              title="No matching topics"
              description="Try a different search."
            />
          ) : (
            <ul className="motion-stagger grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 lg:gap-4">
              {filtered.map((tile) => (
                <li key={tile.id}>
                  <HomepageTileCard
                    href={tile.href}
                    title={tile.displayTitle}
                    subtitle={tile.subtitle}
                    iconKey={tile.iconKey}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </DirectoryPageShell>
  );
}
