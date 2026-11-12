'use client';

import { Download, FileText, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export type SupportAttachmentViewModel = {
  id: string;
  mediaAssetId: string;
  originalFilename: string;
  mimeType: string;
  bytes: number;
  downloadUrl: string | null;
};

function isImageMime(mime: string, filename: string) {
  if (mime.toLowerCase().startsWith('image/')) return true;
  return /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(filename);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SupportAttachmentBubble({
  attachment,
  mine,
}: {
  attachment: SupportAttachmentViewModel;
  mine?: boolean;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const image = isImageMime(attachment.mimeType, attachment.originalFilename);
  const url = attachment.downloadUrl;

  if (image && url) {
    return (
      <>
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className={cn(
            'mt-2 block w-full max-w-[16rem] overflow-hidden rounded-xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
            mine ? 'ring-1 ring-white/25' : 'ring-1 ring-[var(--line)]',
          )}
          aria-label={`View ${attachment.originalFilename}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- signed Cloudinary URL, short-lived */}
          <img
            src={url}
            alt={attachment.originalFilename}
            className="max-h-52 w-full object-cover transition-opacity hover:opacity-95"
            loading="lazy"
          />
          <span
            className={cn(
              'block truncate px-2.5 py-1.5 text-[11px]',
              mine ? 'bg-black/20 text-white/90' : 'bg-[var(--bg-soft,#f1f5f9)] text-[var(--muted)]',
            )}
          >
            {attachment.originalFilename}
          </span>
        </button>
        {lightboxOpen ? (
          <ImageLightbox
            src={url}
            alt={attachment.originalFilename}
            downloadUrl={url}
            filename={attachment.originalFilename}
            onClose={() => setLightboxOpen(false)}
          />
        ) : null}
      </>
    );
  }

  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'mt-2 flex max-w-[16rem] items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs transition-colors',
        mine
          ? 'bg-black/15 text-white hover:bg-black/25'
          : 'bg-[var(--bg-soft,#f1f5f9)] text-[var(--ink)] hover:bg-[var(--bg-muted)]',
        !url && 'pointer-events-none opacity-60',
      )}
    >
      <FileText className="size-5 shrink-0 opacity-80" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{attachment.originalFilename}</span>
        <span className={cn('block', mine ? 'text-white/70' : 'text-[var(--muted)]')}>
          {formatBytes(attachment.bytes)}
        </span>
      </span>
      <Download className="size-3.5 shrink-0 opacity-70" aria-hidden />
    </a>
  );
}

function ImageLightbox({
  src,
  alt,
  downloadUrl,
  filename,
  onClose,
}: {
  src: string;
  alt: string;
  downloadUrl: string;
  filename: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close preview"
        onClick={onClose}
        className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X className="size-5" />
      </button>
      <div
        className="relative flex max-h-[90vh] max-w-[min(56rem,100%)] flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
        />
        <div className="flex items-center gap-3 text-sm text-white/90">
          <span className="max-w-[20rem] truncate">{filename}</span>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 hover:bg-white/25"
          >
            <Download className="size-3.5" />
            Open original
          </a>
        </div>
      </div>
    </div>
  );
}

/** Local file preview in the composer before/while uploading. */
export function SupportPendingAttachmentPreview({
  file,
  previewUrl,
  onClear,
}: {
  file: File;
  previewUrl: string | null;
  onClear: () => void;
}) {
  const image = file.type.startsWith('image/') && previewUrl;
  return (
    <div className="flex items-center gap-2 border-t border-[var(--line)] px-3 py-2">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="" className="size-12 rounded-lg object-cover" />
      ) : (
        <div className="flex size-12 items-center justify-center rounded-lg bg-[var(--bg-muted)]">
          <FileText className="size-5 text-[var(--muted)]" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[var(--ink)]">{file.name}</p>
        <p className="text-[11px] text-[var(--muted)]">{formatBytes(file.size)} · attaching…</p>
      </div>
      <button
        type="button"
        aria-label="Cancel attachment"
        onClick={onClear}
        className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
