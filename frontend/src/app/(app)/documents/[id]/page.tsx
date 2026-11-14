'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PdfViewer } from '@/components/pdf/pdf-viewer-dynamic';
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
    <div className="fixed inset-x-0 bottom-0 top-[var(--header-h)] z-30 flex flex-col bg-[var(--bg)] pb-[env(safe-area-inset-bottom,0px)] lg:static lg:inset-auto lg:z-auto lg:min-h-[70vh] lg:pb-0">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2 sm:gap-3 sm:px-4 lg:rounded-t-[var(--radius-lg)]">
        <Link
          href="/documents"
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-[var(--radius)] px-2 text-sm font-medium text-[var(--muted-strong)] hover:bg-[var(--bg-muted)] hover:text-[var(--highlight)]"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Library
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-display text-sm font-semibold tracking-tight sm:text-base">
              {data.title}
            </h1>
            <Badge variant="outline">{data.visibility}</Badge>
            {data.category ? <Badge>{data.category.name}</Badge> : null}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={bookmark.isPending}
          onClick={() => bookmark.mutate()}
        >
          {data.bookmarked ? 'Remove bookmark' : 'Save PDF'}
        </Button>
        {isPublic ? (
          <Link
            href={`/news/d/${data.id}`}
            className="hidden text-xs font-semibold text-[var(--muted-strong)] hover:text-[var(--highlight)] sm:inline"
          >
            Open on কলাম
          </Link>
        ) : null}
      </div>

      <PdfViewer
        className="min-h-0 flex-1 rounded-none border-0 shadow-none lg:rounded-b-[var(--radius-lg)] lg:border lg:border-t-0 lg:shadow-[var(--shadow-sm)]"
        fileUrl={fileUrl}
        title={data.title}
      />
    </div>
  );
}
