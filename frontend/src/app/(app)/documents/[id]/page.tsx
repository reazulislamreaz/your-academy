'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { ApiError, apiFetch } from '@/lib/api/client';

type DocumentDetail = {
  id: string;
  title: string;
  description?: string | null;
  visibility: string;
  bookmarked: boolean;
  category?: { id: string; name: string } | null;
  mediaAsset: {
    mimeType: string;
    bytes: number;
    originalFilename?: string | null;
    format?: string | null;
  };
  download: { available: boolean; reason: string; url: string | null };
};

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['document', params.id],
    queryFn: () => apiFetch<DocumentDetail>(`/documents/${params.id}`),
    retry: false,
  });

  const bookmark = useMutation({
    mutationFn: async () => {
      if (data?.bookmarked) {
        await apiFetch(`/bookmarks/documents/${params.id}`, { method: 'DELETE' });
        return false;
      }
      await apiFetch('/bookmarks/documents', {
        method: 'POST',
        body: JSON.stringify({ documentId: params.id }),
      });
      return true;
    },
    onSuccess: (bookmarked) => {
      qc.setQueryData<DocumentDetail>(['document', params.id], (prev) =>
        prev ? { ...prev, bookmarked } : prev,
      );
      void qc.invalidateQueries({ queryKey: ['bookmarks'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return (
      <Alert variant="warning">
        Sign in to view this document.{' '}
        <Link href="/login" className="font-semibold underline-offset-2 hover:underline">
          Sign in
        </Link>
      </Alert>
    );
  }

  if (error || !data) return <Alert variant="danger">Document not found.</Alert>;

  return (
    <article className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/documents" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
          ← PDF library
        </Link>
        <Button
          variant="outline"
          size="sm"
          disabled={bookmark.isPending}
          onClick={() => bookmark.mutate()}
        >
          {data.bookmarked ? 'Remove bookmark' : 'Save PDF'}
        </Button>
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight">{data.title}</h1>
      {data.description ? (
        <p className="text-[var(--muted-strong)]">{data.description}</p>
      ) : null}
      <Surface className="space-y-3 p-5">
        <p className="text-sm text-[var(--muted)]">
          File: {data.mediaAsset.originalFilename ?? 'document'} ·{' '}
          {data.mediaAsset.mimeType} · {Math.max(1, Math.round(data.mediaAsset.bytes / 1024))} KB
        </p>
        {data.category ? (
          <p className="text-sm text-[var(--muted)]">Category: {data.category.name}</p>
        ) : null}
        {data.download.available && data.download.url ? (
          <a href={data.download.url} target="_blank" rel="noreferrer">
            <Button>Download</Button>
          </a>
        ) : (
          <Alert variant="info">
            {data.download.reason === 'STORAGE_NOT_CONFIGURED'
              ? 'Cloudinary is not configured — signed download unavailable. Set real CLOUDINARY_* credentials to enable PDF delivery.'
              : data.download.reason === 'PLACEHOLDER_ASSET'
                ? 'This entry uses a placeholder asset (seed/admin metadata). Re-upload a real PDF via Admin → Documents when Cloudinary is configured.'
                : `Download unavailable (${data.download.reason}).`}
          </Alert>
        )}
      </Surface>
    </article>
  );
}
