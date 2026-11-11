'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api/client';
import type { NewsListItem } from '@/lib/api/types';

export default function NewsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['news'],
    queryFn: () => apiFetch<NewsListItem[]>('/news'),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Updates"
        title="News"
        description="Platform updates and study tips. Public — no login required."
      />
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : null}
      {error ? <p className="text-sm text-[var(--danger)]">Could not load news.</p> : null}
      {!isLoading && !error && data?.length === 0 ? (
        <EmptyState title="No published articles yet" description="New posts will appear here." />
      ) : null}
      <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {data?.map((item) => (
          <li key={item.id}>
            <Link href={`/news/${item.slug}`} className="group block py-5">
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
    </div>
  );
}
