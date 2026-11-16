'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ListCardSkeleton, LoadError } from '@/components/loading';
import { EmptyState } from '@/components/ui/empty-state';
import {
  listPublicDocuments,
  type PublicDocumentListItem,
} from '@/lib/api/public-documents';
import type { ApiResult } from '@/lib/api/client';

type Props = {
  initial?: ApiResult<PublicDocumentListItem[]> | null;
};

/** Latest published newspaper PDF columns. */
export function HomepageNewsStrip({ initial = null }: Props) {
  const list = useQuery({
    queryKey: ['homepage-news-docs', 4],
    queryFn: () => listPublicDocuments({ limit: 4 }),
    staleTime: 60_000,
    initialData: initial ?? undefined,
  });

  const items = list.data?.data ?? [];
  const showSkeleton = list.isLoading && items.length === 0;

  return (
    <section
      id="newspaper"
      aria-labelledby="newspaper-heading"
      className="scroll-mt-24 bg-[var(--bg-elevated)] py-[var(--space-section)]"
    >
      <div className="marketing-container space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <span className="mb-1 block h-[3px] w-7 rounded-full bg-[var(--highlight)]" aria-hidden />
            <h2
              id="newspaper-heading"
              className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-[2rem]"
            >
              পত্রিকার গুরুত্বপূর্ণ কলাম
            </h2>
            <p className="text-sm text-[var(--muted-strong)] sm:text-base">
              Admin-published PDF columns — browse without login.
            </p>
          </div>
          <Link href="/news">
            <Button className="rounded-full px-6">
              All columns
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        </div>

        {showSkeleton ? <ListCardSkeleton /> : null}
        {list.isError ? (
          <LoadError message="Could not load columns." onRetry={() => void list.refetch()} />
        ) : null}
        {!showSkeleton && !list.isError && items.length === 0 ? (
          <EmptyState
            title="No published columns yet"
            description="When an admin publishes a PDF document, it will appear here."
          />
        ) : null}

        {items.length > 0 ? (
          <ul className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-desk)] shadow-[var(--shadow-sm)]">
            {items.map((item) => (
              <li key={item.id} className="border-b border-[var(--line)] last:border-b-0">
                <Link
                  href={`/news/d/${item.id}`}
                  className="group flex items-start gap-3 px-4 py-4 transition-colors hover:bg-[var(--bg-elevated)] sm:px-5"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-wash)] text-[var(--accent)]">
                    <FileText className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--highlight)] sm:text-base">
                      {item.title}
                    </span>
                    {item.description ? (
                      <span className="mt-0.5 line-clamp-2 block text-xs text-[var(--muted)] sm:text-sm">
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
