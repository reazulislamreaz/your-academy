'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { HomepagePayload } from '@your-academy/shared';
import { Reveal } from '@/components/motion/reveal';
import { HomepageTileCard } from '@/components/marketing/homepage-tile-card';
import { EmptyState } from '@/components/ui/empty-state';
import { apiFetch } from '@/lib/api/client';
import type { CategoryNode } from '@/lib/api/types';

type CategoryTile = HomepagePayload['categories']['tiles'][number];
type TopicTile = HomepagePayload['topics']['tiles'][number];

type Props =
  | {
      kind: 'categories';
      heading: string;
      subtitle?: string;
      tiles: CategoryTile[];
      backHref?: string;
      backLabel?: string;
    }
  | {
      kind: 'topics';
      heading: string;
      subtitle?: string;
      tiles: TopicTile[];
      backHref?: string;
      backLabel?: string;
    };

function categoryHref(tile: CategoryTile): string {
  return tile.categoryId
    ? `/preli-question-bank?categoryId=${encodeURIComponent(tile.categoryId)}`
    : tile.fallbackHref;
}

function topicHref(tile: TopicTile, roots: CategoryNode[]): string {
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

export function CategoryDirectory(props: Props) {
  const categoryTree = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories', { skipRefresh: true }),
    staleTime: 60_000,
    enabled: props.kind === 'topics',
  });
  const roots = categoryTree.data ?? [];
  const visible = props.tiles.filter((t) => t.visible);
  const backHref = props.backHref ?? '/';
  const backLabel = props.backLabel ?? 'Back to home';

  return (
    <div className="relative overflow-hidden bg-[var(--bg-desk)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--highlight-soft)_0%,_transparent_65%)] opacity-70"
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-[1100px] space-y-8 px-4 py-10 sm:px-6 sm:py-14">
        <Reveal className="space-y-4">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted-strong)] transition-colors hover:text-[var(--highlight)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
          <span
            className="mb-1 block h-[3px] w-7 rounded-full bg-[var(--highlight)]"
            aria-hidden
          />
          <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
            {props.heading}
          </h1>
          {props.subtitle ? (
            <p className="max-w-2xl text-[var(--muted-strong)]">{props.subtitle}</p>
          ) : null}
        </Reveal>

        {visible.length === 0 ? (
          <EmptyState
            title="No categories yet"
            description="When an admin publishes category tiles, they will appear here."
          />
        ) : (
          <Reveal>
            <ul className="motion-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:gap-4">
              {visible.map((tile) => (
                <li key={tile.id}>
                  <HomepageTileCard
                    href={
                      props.kind === 'categories'
                        ? categoryHref(tile as CategoryTile)
                        : topicHref(tile as TopicTile, roots)
                    }
                    title={tile.displayTitle}
                    subtitle={
                      props.kind === 'categories'
                        ? (tile as CategoryTile).subtitle
                        : undefined
                    }
                    iconKey={tile.iconKey}
                    logoUrl={tile.logoUrl}
                  />
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </div>
    </div>
  );
}
