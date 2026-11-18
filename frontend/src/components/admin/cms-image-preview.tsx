'use client';

import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  src: string | null | undefined;
  alt?: string;
  /** Tailwind classes for the image/fallback frame. */
  className?: string;
  /** object-fit for the image (cover for banners, contain for logos). */
  fit?: 'cover' | 'contain';
  emptyLabel?: string;
};

/**
 * Admin CMS thumbnail with load-error fallback.
 * Shows an empty state when no src is provided.
 */
export function CmsImagePreview({
  src,
  alt = '',
  className,
  fit = 'cover',
  emptyLabel = 'No image selected',
}: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div
      className={cn(
        'flex items-center justify-center overflow-hidden rounded-md border border-[var(--line)] bg-[var(--bg-muted)]',
        className,
      )}
    >
      {showImage ? (
        <img
          src={src!}
          alt={alt}
          className={cn(
            'h-full w-full',
            fit === 'cover' ? 'object-cover' : 'object-contain p-0.5',
          )}
          onError={() => setFailed(true)}
          onLoad={() => setFailed(false)}
        />
      ) : (
        <span className="flex flex-col items-center gap-1 px-3 py-4 text-center text-xs text-[var(--muted)]">
          <ImageOff className="size-5 opacity-70" aria-hidden />
          {failed ? 'Preview unavailable' : emptyLabel}
        </span>
      )}
    </div>
  );
}
