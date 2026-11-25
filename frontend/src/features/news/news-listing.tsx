'use client';

import Link from 'next/link';
import { useState } from 'react';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { MarketingPage } from '@/components/layout/marketing-page';
import { PageHeader } from '@/components/layout/page-header';
import { LoadError } from '@/components/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadMoreButton } from '@/components/ui/load-more-button';
import { SearchField } from '@/components/ui/search-field';
import { ContentIn } from '@/components/ui/skeleton';
import { NewsPageSkeleton } from '@/components/skeletons';
import { listPublicDocuments } from '@/lib/api/public-documents';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';

function formatBytes(bytes: number | undefined): string | null {
  if (bytes == null || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Public newspaper-column listing. DEC-069: the header comes from Admin → Page Headers. */
export function NewsListing({
  header,
}: {
  header?: { eyebrow?: string; heading: string; description?: string };
}) {
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q.trim(), 350);

  const list = useInfiniteQuery({
    queryKey: ['public-documents', debouncedQ],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listPublicDocuments({ cursor: pageParam, limit: 20, q: debouncedQ || undefined }),
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const items = list.data?.pages.flatMap((p) => p.data) ?? [];
  const showSkeleton = list.isLoading && !list.isPlaceholderData;

  return (
    <MarketingPage className="space-y-8">
      <PageHeader
        eyebrow={header ? header.eyebrow || undefined : 'কলাম'}
        title={header?.heading || 'পত্রিকার গুরুত্বপূর্ণ কলাম'}
        description={
          header
            ? header.description || undefined
            : 'Admin-published PDF columns — browse and open freely, no login required.'
        }
      />

      <SearchField
        value={q}
        onChange={setQ}
        placeholder="Search columns…"
        aria-label="Search newspaper columns"
      />

      {list.isFetching && !list.isFetchingNextPage && list.isPlaceholderData ? (
        <p className="text-xs font-medium text-[var(--muted)]" aria-live="polite">
          Updating…
        </p>
      ) : null}

      {showSkeleton ? <NewsPageSkeleton omitHeader /> : null}
      {list.error ? (
        <LoadError message="Could not load columns." onRetry={() => void list.refetch()} />
      ) : null}
      {!showSkeleton && !list.isError && items.length === 0 ? (
        <EmptyState
          title={debouncedQ ? 'No matching columns' : 'No published columns yet'}
          description={
            debouncedQ
              ? 'Try a different search.'
              : 'When an admin publishes a PDF document, it will appear here.'
          }
        />
      ) : null}

      {!showSkeleton && !list.isError && items.length > 0 ? (
        <ContentIn>
          <ul
            className={`w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow-sm)] transition-opacity duration-150 ${
              list.isFetching && !list.isFetchingNextPage && list.isPlaceholderData
                ? 'opacity-60'
                : 'opacity-100'
            }`}
            aria-busy={list.isFetching && !list.isFetchingNextPage}
          >
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
    </MarketingPage>
  );
}
