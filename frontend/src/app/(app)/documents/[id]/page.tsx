'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PdfViewer } from '@/components/pdf/pdf-viewer-dynamic';
import { SaveDocumentButton } from '@/features/bookmarks/save-document-button';
import { ApiError, apiFetch } from '@/lib/api/client';
import {
  authenticatedDocumentFileUrl,
  publicDocumentFileUrl,
} from '@/lib/api/public-documents';
import { DocumentDetailPageSkeleton } from '@/components/skeletons';

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
  view?: { available: boolean; reason: string };
  download: { available: boolean; reason: string; url: string | null };
};

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ['document', params.id],
    queryFn: () => apiFetch<DocumentDetail>(`/documents/${params.id}`),
    retry: false,
  });

  if (isLoading) {
    return <DocumentDetailPageSkeleton />;
  }

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

  const viewOk = data.view?.available !== false;
  const isPublic = data.visibility === 'PUBLIC';
  const fileUrl = isPublic
    ? publicDocumentFileUrl(data.id)
    : authenticatedDocumentFileUrl(data.id);

  if (!viewOk) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link href="/documents" className="text-sm text-[var(--muted-strong)] hover:text-[var(--highlight)]">
          ← PDF library
        </Link>
        <h1 className="font-display text-2xl font-bold tracking-tight">{data.title}</h1>
        <Alert variant="info">
          {data.view?.reason === 'PLACEHOLDER_ASSET'
            ? 'This entry uses a placeholder asset. An admin must upload a real PDF.'
            : data.view?.reason === 'STORAGE_NOT_CONFIGURED'
              ? 'Cloudinary is not configured — PDF viewing is unavailable.'
              : 'PDF is not available for viewing yet.'}
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-var(--header-h,3.75rem))] min-h-0 w-full flex-col overflow-hidden bg-[var(--bg)]">
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2 sm:gap-3 sm:px-4">
        <Link
          href="/documents"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius)] text-[var(--muted-strong)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]"
          aria-label="Back to library"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-sm font-semibold tracking-tight sm:text-base">
            {data.title}
          </h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{data.visibility}</Badge>
            {data.category ? <Badge>{data.category.name}</Badge> : null}
            {data.bookmarked ? <Badge variant="bookmark">Saved</Badge> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SaveDocumentButton documentId={data.id} bookmarked={data.bookmarked} />
          {isPublic ? (
            <Link
              href={`/news/d/${data.id}`}
              className="hidden text-xs font-semibold text-[var(--muted-strong)] hover:text-[var(--highlight)] sm:inline"
            >
              Open on কলাম
            </Link>
          ) : null}
        </div>
      </div>

      <PdfViewer
        className="min-h-0 flex-1 rounded-none border-0 shadow-none"
        fileUrl={fileUrl}
        title={data.title}
      />
    </div>
  );
}
