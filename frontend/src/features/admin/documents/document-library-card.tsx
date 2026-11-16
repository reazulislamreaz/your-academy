'use client';

import Link from 'next/link';
import {
  CalendarDays,
  Eye,
  FileText,
  FolderOpen,
  Globe2,
  Pencil,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { AdminPublishedFlag } from '@/components/admin/admin-status';
import type { AdminDocumentItem } from '@/lib/api/admin-types';
import { cn } from '@/lib/utils';

type Props = {
  doc: AdminDocumentItem;
  busy?: boolean;
  onEdit: (doc: AdminDocumentItem) => void;
  onTogglePublish: (doc: AdminDocumentItem) => void;
  onMakePublic: (doc: AdminDocumentItem) => void;
  onDelete: (doc: AdminDocumentItem) => Promise<unknown>;
};

export function DocumentLibraryCard({
  doc,
  busy,
  onEdit,
  onTogglePublish,
  onMakePublic,
  onDelete,
}: Props) {
  const filename = doc.mediaAsset?.originalFilename ?? 'No file attached';
  const sizeLabel = doc.mediaAsset?.bytes != null ? formatBytes(doc.mediaAsset.bytes) : null;
  const uploadedAt = formatDate(doc.createdAt ?? doc.updatedAt);
  const canPreview = doc.visibility === 'PUBLIC' && doc.isPublished;
  const needsMakePublic = doc.visibility !== 'PUBLIC';

  return (
    <article
      className={cn(
        'group relative overflow-visible rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)]',
        'transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
        'hover:border-[var(--accent)]/35 hover:shadow-[var(--shadow)]',
        'sm:p-5',
        busy && 'pointer-events-none opacity-70',
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex min-w-0 gap-3 sm:gap-4">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--highlight-soft)] text-[var(--highlight)] sm:size-12"
            aria-hidden
          >
            <FileText className="size-5 sm:size-6" strokeWidth={1.75} />
          </div>

          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <AdminPublishedFlag published={doc.isPublished} />
              <Badge variant={doc.visibility === 'PUBLIC' ? 'success' : 'outline'}>
                {doc.visibility === 'PUBLIC' ? 'Public' : doc.visibility}
              </Badge>
              <Badge variant="outline">PDF</Badge>
            </div>

            <div className="min-w-0">
              <h3 className="font-display text-base font-semibold tracking-tight text-[var(--ink)] sm:text-[1.05rem]">
                {doc.title}
              </h3>
              {doc.description ? (
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[var(--muted-strong)]">
                  {doc.description}
                </p>
              ) : null}
            </div>

            <dl className="grid gap-2 text-xs text-[var(--muted-strong)] sm:grid-cols-2 xl:grid-cols-4">
              <MetaItem icon={UploadCloud} label="File" value={filename} />
              <MetaItem
                icon={FolderOpen}
                label="Category"
                value={doc.category?.name ?? 'Uncategorized'}
              />
              <MetaItem icon={FileText} label="Size" value={sizeLabel ?? '—'} />
              <MetaItem icon={CalendarDays} label="Uploaded" value={uploadedAt} />
            </dl>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--line)] pt-3 sm:gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onEdit(doc)}
          >
            <Pencil className="size-3.5" aria-hidden />
            Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant={doc.isPublished ? 'ghost' : 'secondary'}
            disabled={busy}
            onClick={() => onTogglePublish(doc)}
          >
            {doc.isPublished ? 'Unpublish' : 'Publish'}
          </Button>
          {canPreview ? (
            <Link href={`/news/d/${doc.id}`} target="_blank" rel="noreferrer">
              <Button type="button" size="sm" variant="ghost" disabled={busy}>
                <Eye className="size-3.5" aria-hidden />
                Preview
              </Button>
            </Link>
          ) : null}
          <ConfirmButton
            size="sm"
            variant="ghost"
            className="text-[var(--danger)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
            confirmTitle="Delete this document?"
            confirmMessage={`“${doc.title}” will be soft-deleted and removed from public/learner libraries.`}
            confirmLabel="Delete"
            reversible={false}
            disabled={busy}
            onConfirm={() => onDelete(doc)}
          >
            <Trash2 className="size-3.5" aria-hidden />
            Delete
          </ConfirmButton>

          {needsMakePublic ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => onMakePublic(doc)}
            >
              <Globe2 className="size-3.5" aria-hidden />
              Make public
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-[var(--radius)] bg-[var(--bg-desk)]/70 px-2.5 py-2">
      <dt className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
        <Icon className="size-3 shrink-0" aria-hidden />
        {label}
      </dt>
      <dd className="mt-0.5 truncate font-medium text-[var(--ink-soft)]" title={value}>
        {value}
      </dd>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
