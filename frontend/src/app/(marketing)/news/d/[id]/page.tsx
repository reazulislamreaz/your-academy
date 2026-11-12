'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { PdfViewer } from '@/components/pdf/pdf-viewer';
import { PageLoader } from '@/components/loading';
import { ApiError } from '@/lib/api/client';
import { getPublicDocument, publicDocumentFileUrl } from '@/lib/api/public-documents';

export default function PublicDocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['public-document', params.id],
    queryFn: () => getPublicDocument(params.id),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <PageLoader label="Loading column" />
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="mx-auto w-full max-w-[720px] space-y-4 px-4 py-8 sm:px-6">
        <Alert variant="danger">Column not found or not published.</Alert>
        <Link href="/news" className="text-sm text-[var(--muted-strong)] hover:text-[var(--highlight)]">
          ← Back to কলাম
        </Link>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto w-full max-w-[720px] space-y-4 px-4 py-8 sm:px-6">
        <Alert variant="danger">Could not load this column.</Alert>
        <button
          type="button"
          className="text-sm font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
          onClick={() => void refetch()}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data.view.available) {
    return (
      <div className="mx-auto w-full max-w-[720px] space-y-4 px-4 py-8 sm:px-6">
        <Link href="/news" className="text-sm text-[var(--muted-strong)] hover:text-[var(--highlight)]">
          ← পত্রিকার গুরুত্বপূর্ণ কলাম
        </Link>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{data.title}</h1>
        <Alert variant="info">
          PDF is not available for viewing yet
          {data.view.reason === 'PLACEHOLDER_ASSET'
            ? ' (placeholder asset — re-upload a real PDF in Admin → Documents).'
            : data.view.reason === 'STORAGE_NOT_CONFIGURED'
              ? ' (Cloudinary is not configured).'
              : '.'}
        </Alert>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 top-[var(--header-h)] z-40 flex flex-col bg-[var(--bg)]">
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2 sm:px-4">
        <Link
          href="/news"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted-strong)] hover:text-[var(--highlight)]"
        >
          <ArrowLeft className="size-4" aria-hidden />
          কলাম
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-base font-semibold tracking-tight text-[var(--ink)] sm:text-lg">
            {data.title}
          </h1>
          {data.description ? (
            <p className="truncate text-xs text-[var(--muted-strong)]">{data.description}</p>
          ) : null}
        </div>
      </div>

      <PdfViewer
        className="min-h-0 flex-1 rounded-none border-0 shadow-none"
        fileUrl={publicDocumentFileUrl(data.id)}
        title={data.title}
      />
    </div>
  );
}
