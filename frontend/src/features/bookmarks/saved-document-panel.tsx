'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Maximize2 } from 'lucide-react';
import { PdfViewer } from '@/components/pdf/pdf-viewer-dynamic';
import { PageLoader } from '@/components/loading';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api/client';
import {
  authenticatedDocumentFileUrl,
  publicDocumentFileUrl,
} from '@/lib/api/public-documents';
import { PanelShell } from './saved-question-panel';

type DocumentDetail = {
  id: string;
  title: string;
  description?: string | null;
  visibility: string;
  category?: { id: string; name: string } | null;
  view?: { available: boolean; reason: string };
};

type Props = {
  documentId: string;
  number: number;
  total: number;
};

/** Inline PDF reader for one saved document (same proxy URLs as `/documents/:id`). */
export function SavedDocumentPanel({ documentId, number, total }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => apiFetch<DocumentDetail>(`/documents/${documentId}`),
    retry: false,
  });

  if (isLoading) {
    return (
      <PanelShell kindLabel="PDF" number={number} total={total}>
        <PageLoader compact label="Loading PDF" />
      </PanelShell>
    );
  }

  if (error || !data) {
    return (
      <PanelShell kindLabel="PDF" number={number} total={total}>
        <Alert variant="warning">
          This PDF is no longer available. You can remove it from your saved items.
        </Alert>
      </PanelShell>
    );
  }

  const viewOk = data.view?.available !== false;
  const fileUrl =
    data.visibility === 'PUBLIC'
      ? publicDocumentFileUrl(data.id)
      : authenticatedDocumentFileUrl(data.id);

  return (
    <PanelShell
      kindLabel="PDF"
      number={number}
      total={total}
      action={
        viewOk ? (
          <Link
            href={`/documents/${data.id}`}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--line)] px-3 text-xs font-semibold text-[var(--muted-strong)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
          >
            <Maximize2 className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Full screen</span>
          </Link>
        ) : null
      }
    >
      <h2 className="type-prose-title break-words text-[var(--ink)]">{data.title}</h2>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline">{data.visibility}</Badge>
        {data.category ? <Badge>{data.category.name}</Badge> : null}
      </div>
      {data.description ? (
        <p className="mt-2 text-sm break-words text-[var(--muted-strong)]">{data.description}</p>
      ) : null}

      {viewOk ? (
        <div className="mt-4 flex h-[min(75dvh,52rem)] min-h-[22rem] flex-col overflow-hidden rounded-[var(--radius)] border border-[var(--line)]">
          <PdfViewer
            className="min-h-0 flex-1 rounded-none border-0 shadow-none"
            fileUrl={fileUrl}
            title={data.title}
          />
        </div>
      ) : (
        <Alert variant="info" className="mt-4">
          {data.view?.reason === 'PLACEHOLDER_ASSET'
            ? 'This entry uses a placeholder asset. An admin must upload a real PDF.'
            : data.view?.reason === 'STORAGE_NOT_CONFIGURED'
              ? 'PDF storage is not configured — viewing is unavailable.'
              : 'PDF is not available for viewing yet.'}
        </Alert>
      )}
    </PanelShell>
  );
}
