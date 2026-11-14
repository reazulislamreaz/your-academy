'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import type { HomepagePayload } from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/reveal';
import { apiFetch } from '@/lib/api/client';
import type { CategoryNode } from '@/lib/api/types';
import { HomepageIcon } from '@/lib/homepage-icon-map';

type Props = {
  categories: HomepagePayload['categories'];
  topics: HomepagePayload['topics'];
};

export function HomepageBankBrowse({ categories, topics }: Props) {
  const categoryTree = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories', { skipRefresh: true }),
    staleTime: 60_000,
  });

  const roots = categoryTree.data ?? [];

  return (
    <>
      {categories.visible ? (
        <section className="section-pad">
          <Reveal className="mx-auto grid w-full max-w-[1280px] items-center gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,2.2fr)] lg:gap-10">
            <div className="space-y-4">
              <span
                className="mb-1 block h-[3px] w-7 rounded-full bg-[var(--highlight)]"
                aria-hidden
              />
              <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-[2rem]">
                {categories.heading}
              </h2>
              <p className="text-[var(--muted-strong)]">{categories.subtitle}</p>
              {categories.cta.visible ? (
                <Link href={categories.cta.href} className="inline-flex pt-1">
                  <Button className="rounded-full px-6 shadow-sm">
                    {categories.cta.label}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : null}
            </div>
            <ul className="motion-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
              {categories.tiles
                .filter((t) => t.visible)
                .map((tile) => {
                  const href = tile.categoryId
                    ? `/preli-question-bank?categoryId=${encodeURIComponent(tile.categoryId)}`
                    : tile.fallbackHref;
                  return (
                    <li key={tile.id}>
                      <Link
                        href={href}
                        className="motion-hover-lift ya-panel-shine relative group flex h-full flex-col items-center gap-2.5 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] px-2 py-5 text-center shadow-[var(--shadow-sm)] transition-[border-color,box-shadow] duration-[var(--duration-fast)] hover:border-[var(--highlight)]/50"
                      >
                        <HomepageIcon
                          iconKey={tile.iconKey}
                          className="relative z-[1] h-12 w-12"
                        />
                        <span className="relative z-[1]">
                          <span className="block font-display text-sm leading-snug font-bold tracking-tight text-[var(--ink)] sm:text-[15px]">
                            {tile.displayTitle}
                          </span>
                          {tile.subtitle ? (
                            <span className="mt-0.5 block text-xs leading-snug text-[var(--muted-strong)]">
                              {tile.subtitle}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </Reveal>
        </section>
      ) : null}

      {topics.visible ? (
        <section className="pb-[var(--space-section)]">
          <Reveal className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
            <div className="rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--info-soft)] px-5 py-7 shadow-[var(--shadow-sm)] sm:px-8 sm:py-8">
              <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,2.2fr)] lg:gap-10">
                <div className="space-y-4">
                  <span
                    className="mb-1 block h-[3px] w-7 rounded-full bg-[var(--highlight)]"
                    aria-hidden
                  />
                  <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-[2rem]">
                    {topics.heading}
                  </h2>
                  {topics.cta.visible ? (
                    <Link href={topics.cta.href} className="inline-flex pt-1">
                      <Button className="rounded-full px-6 shadow-sm">
                        {topics.cta.label}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : null}
                </div>
                <ul className="motion-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
                  {topics.tiles
                    .filter((t) => t.visible)
                    .map((tile) => {
                      let href = tile.fallbackHref;
                      if (tile.categoryId && tile.subcategoryId) {
                        href = `/preli-question-bank?categoryId=${encodeURIComponent(tile.categoryId)}&subcategoryId=${encodeURIComponent(tile.subcategoryId)}`;
                      } else if (tile.categoryId) {
                        href = `/preli-question-bank?categoryId=${encodeURIComponent(tile.categoryId)}`;
                      } else if (tile.subcategoryId) {
                        // Resolve parent if only subcategory set
                        for (const root of roots) {
                          if (root.children.some((c) => c.id === tile.subcategoryId)) {
                            href = `/preli-question-bank?categoryId=${encodeURIComponent(root.id)}&subcategoryId=${encodeURIComponent(tile.subcategoryId)}`;
                            break;
                          }
                        }
                      }
                      return (
                        <li key={tile.id}>
                          <Link
                            href={href}
                            className="motion-hover-lift ya-panel-shine relative group flex h-full flex-col items-center gap-2.5 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] px-2 py-5 text-center shadow-[var(--shadow-sm)] transition-[border-color,box-shadow] duration-[var(--duration-fast)] hover:border-[var(--highlight)]/50"
                          >
                            <HomepageIcon
                              iconKey={tile.iconKey}
                              className="relative z-[1] h-12 w-12"
                            />
                            <span className="relative z-[1] font-display text-sm font-bold tracking-tight text-[var(--ink)] sm:text-[15px]">
                              {tile.displayTitle}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                </ul>
              </div>
            </div>
          </Reveal>
        </section>
      ) : null}
    </>
  );
}
