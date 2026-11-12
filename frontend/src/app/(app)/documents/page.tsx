'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { ListRow } from '@/components/ui/list-row';
import { LoadMoreButton } from '@/components/ui/load-more-button';
import { ContentIn } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api/client';
import type { DocumentListItem } from '@/lib/api/types';
import { DocumentsPageSkeleton } from '@/components/skeletons';
import { useCursorList } from '@/lib/hooks/use-cursor-list';

export default function DocumentsPage() {
  const list = useCursorList<DocumentListItem>(
    ['documents'],
    (cursor) => {
      const qs = new URLSearchParams({ limit: '20' });
      if (cursor) qs.set('cursor', cursor);
      return `/documents?${qs}`;
    },
    { retry: false },
  );

  const unauthorized =
    list.error instanceof ApiError && (list.error.status === 401 || list.error.status === 403);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Study materials"
        title="PDF library"
        description="Published study documents. Downloads require configured cloud storage."
      />

      {list.isLoading ? <DocumentsPageSkeleton omitHeader /> : null}

      {unauthorized ? (
        <Alert variant="warning">
          Sign in to browse documents.{' '}
          <Link href="/login" className="font-semibold underline-offset-2 hover:underline">
            Sign in
          </Link>
        </Alert>
      ) : null}

      {list.isError && !unauthorized ? (
        <Alert variant="danger">Could not load documents.</Alert>
      ) : null}

      {!list.isLoading && !list.isError && list.items.length === 0 ? (
        <EmptyState
          title="No documents published"
          description="Admins can add PDFs once storage uploads are enabled."
        />
      ) : null}

      {!list.isLoading && !list.isError && list.items.length > 0 ? (
        <ContentIn>
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)]">
            {list.items.map((doc) => (
              <ListRow
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="px-4 py-3.5 sm:px-5"
                meta={doc.category ? <span>{doc.category.name}</span> : undefined}
                title={
                  <span className="font-display text-lg font-semibold tracking-tight">
                    {doc.title}
                  </span>
                }
                description={doc.description}
                trailing={
                  <ChevronRight className="h-4 w-4 text-[var(--muted-strong)]" aria-hidden />
                }
              />
            ))}
          </div>
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
