'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { ListRow } from '@/components/ui/list-row';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { DocumentListItem } from '@/lib/api/types';

export default function DocumentsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['documents'],
    queryFn: () => apiFetch<DocumentListItem[]>('/documents'),
    retry: false,
  });

  const unauthorized =
    error instanceof ApiError && (error.status === 401 || error.status === 403);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Study materials"
        title="PDF library"
        description="Published study documents. Downloads require configured cloud storage."
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : null}

      {unauthorized ? (
        <Alert variant="warning">
          Sign in to browse documents.{' '}
          <Link href="/login" className="font-semibold underline-offset-2 hover:underline">
            Sign in
          </Link>
        </Alert>
      ) : null}

      {error && !unauthorized ? <Alert variant="danger">Could not load documents.</Alert> : null}

      {!isLoading && !error && data?.length === 0 ? (
        <EmptyState
          title="No documents published"
          description="Admins can add PDFs once storage uploads are enabled."
        />
      ) : null}

      <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {data?.map((doc) => (
          <ListRow
            key={doc.id}
            href={`/documents/${doc.id}`}
            meta={doc.category ? <span>{doc.category.name}</span> : undefined}
            title={<span className="font-display text-lg font-semibold tracking-tight">{doc.title}</span>}
            description={doc.description}
            trailing={<ChevronRight className="h-4 w-4 text-[var(--muted)]" aria-hidden />}
          />
        ))}
      </div>
    </div>
  );
}
