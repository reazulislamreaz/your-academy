'use client';

import { useQuery } from '@tanstack/react-query';
import type { HomepagePayload } from '@your-academy/shared';
import { Reveal } from '@/components/motion/reveal';
import { DirectoryPageShell } from '@/components/marketing/directory-page-shell';
import { DirectoryTileGridSkeleton } from '@/components/marketing/directory-tile-grid-skeleton';
import { HomepageTileCard } from '@/components/marketing/homepage-tile-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRegion } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api/client';
import type { CategoryNode } from '@/lib/api/types';
import {
  dbCategoryHref,
  dbSubcategoryHref,
  guessHomepageIconKey,
  matchCategoryTile,
} from '@/lib/homepage-tile-links';

type Props = {
  heading: string;
  subtitle?: string;
  /** Published homepage tiles — used only to enrich logos/icons when IDs/names match. */
  tiles: HomepagePayload['categories']['tiles'];
};

export function QuestionBankCategoriesDirectory({ heading, subtitle, tiles }: Props) {
  const visibleTiles = tiles.filter((t) => t.visible);
  const tree = useQuery({
    queryKey: ['categories', 'public'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories', { skipRefresh: true }),
    staleTime: 60_000,
  });

  const roots = tree.data ?? [];
  const hasAny =
    roots.length > 0 &&
    roots.some((r) => (r.children?.length ?? 0) > 0 || Boolean(r.id));

  return (
    <DirectoryPageShell heading={heading} subtitle={subtitle}>
      <SkeletonRegion
        loading={tree.isLoading}
        label="Loading categories"
        fallback={<DirectoryTileGridSkeleton count={12} />}
      >
        {tree.isError ? (
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
        ) : !hasAny ? (
          <EmptyState
            align="center"
            title="No categories yet"
            description="When exam categories are published in the question bank, they will appear here."
          />
        ) : (
          <div className="space-y-10">
            {roots.map((root) => {
              const children = root.children ?? [];
              const rootTile = matchCategoryTile(visibleTiles, {
                categoryId: root.id,
                name: root.name,
              });

              return (
                <Reveal key={root.id} className="space-y-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h2 className="font-display text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                        {root.name}
                      </h2>
                      {root.description ? (
                        <p className="mt-1 text-sm text-[var(--muted-strong)]">
                          {root.description}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <ul className="motion-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:gap-4">
                    <li>
                      <HomepageTileCard
                        href={dbCategoryHref(root.id)}
                        title={`All ${root.name}`}
                        subtitle="Full category"
                        iconKey={rootTile?.iconKey ?? guessHomepageIconKey(root.name)}
                        logoUrl={rootTile?.logoUrl}
                      />
                    </li>
                    {children.map((child) => {
                      const tile = matchCategoryTile(visibleTiles, {
                        categoryId: child.id,
                        name: child.name,
                      });
                      return (
                        <li key={child.id}>
                          <HomepageTileCard
                            href={dbSubcategoryHref(root.id, child.id)}
                            title={child.name}
                            subtitle={child.description ?? undefined}
                            iconKey={tile?.iconKey ?? guessHomepageIconKey(child.name)}
                            logoUrl={tile?.logoUrl}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </Reveal>
              );
            })}
          </div>
        )}
      </SkeletonRegion>
    </DirectoryPageShell>
  );
}
