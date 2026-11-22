'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  flattenSubcategories,
  publicCategoriesQueryKey,
} from '@/lib/api/categories';
import {
  guessHomepageIconKey,
  writtenSubcategoryHref,
} from '@/lib/homepage-tile-links';

type Props = {
  heading?: string;
  subtitle?: string;
  breadcrumbLabel?: string;
};

/**
 * Full Written subcategory catalog — WRITTEN scope only.
 * Linked from homepage Others / View all → `/written-question-bank-categories`.
 */
export function WrittenSubcategoriesDirectory({
  heading = 'All Written Subcategories',
  subtitle = 'Browse every Written exam subcategory and jump straight into the bank.',
  breadcrumbLabel = 'Written exam categories',
}: Props) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const tree = useQuery({
    queryKey: publicCategoriesQueryKey('WRITTEN'),
    queryFn: () => fetchPublicCategories('WRITTEN'),
    staleTime: 60_000,
  });

  const allSubs = useMemo(
    () => flattenSubcategories(tree.data ?? []),
    [tree.data],
  );

  const filtered = useMemo(() => {
    if (!q) return allSubs;
    return allSubs.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.label.toLowerCase().includes(q),
    );
  }, [allSubs, q]);

  return (
    <DirectoryPageShell
      heading={heading}
      subtitle={subtitle}
      breadcrumbLabel={breadcrumbLabel}
      backLabel="Back to homepage"
    >
      <div className="space-y-6">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search Written subcategories…"
          aria-label="Search Written subcategories"
          variant="pill"
          className="max-w-md"
        />

        <SkeletonRegion
          loading={tree.isLoading}
          label="Loading Written subcategories"
          fallback={<DirectoryTileGridSkeleton count={12} />}
        >
          {tree.isError ? (
            <EmptyState
              align="center"
              title="Couldn’t load Written subcategories"
              description="Check your connection and try again."
              action={
                <Button type="button" variant="secondary" onClick={() => void tree.refetch()}>
                  Retry
                </Button>
              }
            />
          ) : allSubs.length === 0 ? (
            <EmptyState
              align="center"
              title="No Written subcategories yet"
              description="When Written bank subcategories are published, they will appear here."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              align="center"
              title="No matches"
              description="Try a different search term."
            />
          ) : (
            <Reveal>
              <ul className="motion-stagger grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-4 xl:grid-cols-6">
                {filtered.map((sub) => (
                  <li key={sub.id}>
                    <HomepageTileCard
                      href={writtenSubcategoryHref(sub.id, sub.parentId)}
                      title={sub.name}
                      subtitle={sub.label.includes(' · ') ? sub.label.split(' · ')[0] : undefined}
                      iconKey={guessHomepageIconKey(sub.name)}
                    />
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </SkeletonRegion>
      </div>
    </DirectoryPageShell>
  );
}
