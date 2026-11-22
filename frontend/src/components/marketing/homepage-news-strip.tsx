'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ListCardSkeleton, LoadError } from '@/components/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { HomepageReveal } from '@/components/marketing/homepage-gsap';
import { listPublicDocuments, type PublicDocumentListItem } from '@/lib/api/public-documents';
import type { ApiResult } from '@/lib/api/client';

type Props = {
  initial?: ApiResult<PublicDocumentListItem[]> | null;
  content?: {
    eyebrow?: string;
    heading?: string;
    subtitle?: string;
    cta?: { label: string; href: string; visible: boolean };
  };
};

/** Latest published newspaper PDF columns. */
export function HomepageNewsStrip({ initial = null, content }: Props) {
  const list = useQuery({
    queryKey: ['homepage-news-docs', 4],
    queryFn: () => listPublicDocuments({ limit: 4 }),
    staleTime: 60_000,
    initialData: initial ?? undefined,
  });

  const items = list.data?.data ?? [];
  const showSkeleton = list.isLoading && items.length === 0;

  return (
    <section id="newspaper" aria-labelledby="newspaper-heading" className="hp-section">
      <HomepageReveal className="marketing-container space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl space-y-3">
            <span className="hp-mark" aria-hidden />
            <p className="hp-eyebrow">{content?.eyebrow?.trim() || 'Newspaper'}</p>
            <h2 id="newspaper-heading" className="hp-heading text-[1.5rem] sm:text-[1.85rem]">
              {content?.heading || 'পত্রিকার গুরুত্বপূর্ণ কলাম'}
            </h2>
            <p className="hp-lede text-sm sm:text-[0.975rem]">
              {content?.subtitle || 'Admin-published PDF columns — browse without login.'}
            </p>
          </div>
          {content?.cta?.visible === false ? null : (
            <Link href={content?.cta?.href || '/news'}>
              <Button className="min-h-11 rounded-full px-6 font-semibold shadow-[var(--hp-cta-shadow)]">
                {content?.cta?.label || 'All columns'}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
          )}
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
          <ul className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/news/d/${item.id}`}
                  className="hp-list-link group flex items-start gap-3 p-4 shadow-[var(--hp-shadow)]"
                >
                  <span className="hp-icon-chip mt-0.5 h-10 w-10 shrink-0">
                    <FileText className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-sm font-semibold text-[var(--ink)] transition-colors group-hover:text-[var(--highlight)] sm:text-base">
                      {item.title}
                    </span>
                    {item.description ? (
                      <span className="mt-0.5 line-clamp-2 block text-xs text-[var(--muted)] sm:text-sm">
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                  <ArrowRight
                    className="mt-1 h-4 w-4 shrink-0 text-[var(--muted)] transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--highlight)]"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </HomepageReveal>
    </section>
  );
}
