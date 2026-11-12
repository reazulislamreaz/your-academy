'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadMoreButton } from '@/components/ui/load-more-button';
import { ContentIn } from '@/components/ui/skeleton';
import type { NewsListItem } from '@/lib/api/types';
import { NewsPageSkeleton } from '@/components/skeletons';
import { useCursorList } from '@/lib/hooks/use-cursor-list';

export default function NewsPage() {
  const list = useCursorList<NewsListItem>(['news'], (cursor) => {
    const qs = new URLSearchParams({ limit: '20' });
    if (cursor) qs.set('cursor', cursor);
    return `/news?${qs}`;
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Updates"
        title="News"
        description="Platform updates and study tips. Public — no login required."
      />
      {list.isLoading ? <NewsPageSkeleton omitHeader /> : null}
      {list.error ? <Alert variant="danger">Could not load news.</Alert> : null}
      {!list.isLoading && !list.isError && list.items.length === 0 ? (
        <EmptyState title="No published articles yet" description="New posts will appear here." />
      ) : null}
      {!list.isLoading && !list.isError && list.items.length > 0 ? (
        <ContentIn>
          <ul className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow-sm)]">
            {list.items.map((item) => (
              <li key={item.id} className="list-row">
                <Link href={`/news/${item.slug}`} className="group block px-4 py-4 sm:px-5 sm:py-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-display text-xl font-semibold tracking-tight group-hover:underline group-hover:underline-offset-4">
                      {item.title}
                    </h2>
                    {item.publishedAt ? (
                      <time className="text-xs text-[var(--muted-strong)]">
                        {new Date(item.publishedAt).toLocaleDateString()}
                      </time>
                    ) : null}
                  </div>
                  {item.summary ? (
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted-strong)]">
                      {item.summary}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
          <LoadMoreButton
            hasNextPage={list.hasNextPage}
            isFetchingNextPage={list.isFetchingNextPage}
            onLoadMore={() => void list.fetchNextPage()}
          />
        </ContentIn>
      ) : null}
    </div>
  );
}
