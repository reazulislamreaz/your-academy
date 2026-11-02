'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
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
        title="PDF library"
        description="Published study documents. Downloads require configured cloud storage."
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
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

      {error && !unauthorized ? (
        <Alert variant="danger">Could not load documents.</Alert>
      ) : null}

      {!isLoading && !error && data?.length === 0 ? (
        <EmptyState
          title="No documents published"
          description="Admins can add PDFs once storage uploads are enabled."
        />
      ) : null}

      <div className="grid gap-3">
        {data?.map((doc) => (
          <Link
            key={doc.id}
            href={`/documents/${doc.id}`}
            className="block rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]"
          >
            <h2 className="text-lg font-semibold">{doc.title}</h2>
            {doc.description ? (
              <p className="mt-2 text-sm text-[var(--muted)]">{doc.description}</p>
            ) : null}
            {doc.category ? (
              <p className="mt-2 text-xs text-[var(--muted)]">{doc.category.name}</p>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
