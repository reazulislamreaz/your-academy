'use client';

import Link from 'next/link';
import { useDeferredValue, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FileText, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { LoadError } from '@/components/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { LoadMoreButton } from '@/components/ui/load-more-button';
import { ContentIn } from '@/components/ui/skeleton';
import { NewsPageSkeleton } from '@/components/skeletons';
import { listPublicDocuments } from '@/lib/api/public-documents';

function formatBytes(bytes: number | undefined): string | null {
  if (bytes == null || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NewsPage() {
  const [q, setQ] = useState('');
  const deferredQ = useDeferredValue(q.trim());

  const list = useInfiniteQuery({
    queryKey: ['public-documents', deferredQ],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listPublicDocuments({ cursor: pageParam, limit: 20, q: deferredQ || undefined }),
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
  });

  const items = list.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="mx-auto w-full max-w-[960px] space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow="কলাম"
        title="পত্রিকার গুরুত্বপূর্ণ কলাম"
        description="Admin-published PDF columns — browse and open freely, no login required."
      />

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-strong)]"
          aria-hidden
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search columns…"
          className="pl-10"
          aria-label="Search newspaper columns"
        />
      </div>

      {list.isLoading ? <NewsPageSkeleton omitHeader /> : null}
      {list.error ? (
        <LoadError message="Could not load columns." onRetry={() => void list.refetch()} />
      ) : null}
      {!list.isLoading && !list.isError && items.length === 0 ? (
        <EmptyState
          title={deferredQ ? 'No matching columns' : 'No published columns yet'}
          description={
            deferredQ
              ? 'Try a different search.'
              : 'When an admin publishes a PDF document, it will appear here.'
          }
        />
      ) : null}

      {!list.isLoading && !list.isError && items.length > 0 ? (
        <ContentIn>
          <ul className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow-sm)]">
            {items.map((item) => {
              const size = formatBytes(item.mediaAsset?.bytes);
              const filename = item.mediaAsset?.originalFilename;
              return (
                <li key={item.id} className="list-row">
                  <Link
                    href={`/news/d/${item.id}`}
                    className="group flex items-start gap-3 px-4 py-4 sm:px-5 sm:py-5"
                  >
                    <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--bg-sunken)] text-[var(--highlight)]">
                      <FileText className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 className="font-display text-xl font-semibold tracking-tight group-hover:underline group-hover:underline-offset-4">
                          {item.title}
                        </h2>
                        <time className="text-xs text-[var(--muted-strong)]">
                          {new Date(item.updatedAt).toLocaleDateString()}
                        </time>
                      </div>
                      {item.description ? (
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted-strong)]">
                          {item.description}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-[var(--muted-strong)]">
                        {[item.category?.name, filename, size].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
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
