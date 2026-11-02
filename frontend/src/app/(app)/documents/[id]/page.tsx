'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
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
  const { data, isLoading, error } = useQuery({
    queryKey: ['document', params.id],
    queryFn: () => apiFetch<DocumentDetail>(`/documents/${params.id}`),
    retry: false,
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
      <Link href="/documents" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
        ← PDF library
      </Link>
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
            Secure download is not available yet ({data.download.reason}). Metadata is listed so the
            library UX can be verified; Cloudinary signing ships in the storage closeout.
          </Alert>
        )}
      </Surface>
    </article>
  );
}
