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
        title="News"
        description="Platform updates and study tips. Public — no login required."
      />
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-[var(--danger)]">Could not load news.</p>
      ) : null}
      {!isLoading && !error && data?.length === 0 ? (
        <EmptyState title="No published articles yet" description="New posts will appear here." />
      ) : null}
      <div className="grid gap-3">
        {data?.map((item) => (
          <Link
            key={item.id}
            href={`/news/${item.slug}`}
            className="block rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow)]"
          >
            <h2 className="text-xl font-semibold">{item.title}</h2>
            {item.summary ? <p className="mt-2 text-[var(--muted)]">{item.summary}</p> : null}
            {item.publishedAt ? (
              <p className="mt-3 text-xs text-[var(--muted)]">
                {new Date(item.publishedAt).toLocaleDateString()}
              </p>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
