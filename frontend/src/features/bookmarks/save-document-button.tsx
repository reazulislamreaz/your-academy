'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bookmark } from 'lucide-react';
import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { ApiError, apiFetch } from '@/lib/api/client';
import { isUnauthorized, useMe } from '@/features/auth/use-auth';
import { cn } from '@/lib/utils';
import { SaveToCollectionDialog } from './save-to-collection-dialog';

type Props = {
  documentId: string;
  /** Prefer authenticated detail when already loaded (e.g. /documents/:id). */
  bookmarked?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  /** Path to return to after login (public viewer). */
  loginNext?: string;
};

/**
 * Save a PDF into a folder (or manage / remove the save) — same folder picker as
 * Save MCQ (DEC-059). Auth required; guests get a login link.
 */
export function SaveDocumentButton({
  documentId,
  bookmarked: bookmarkedProp,
  className,
  size = 'sm',
  loginNext,
}: Props) {
  const me = useMe();
  const [pickerOpen, setPickerOpen] = useState(false);
  const loggedIn = Boolean(me.data) && !isUnauthorized(me.error);
  const next = loginNext ?? `/documents/${documentId}`;
  const loginHref = `/login?next=${encodeURIComponent(next)}`;

  const status = useQuery({
    queryKey: ['document-bookmark', documentId],
    queryFn: async () => {
      try {
        const doc = await apiFetch<{ bookmarked?: boolean }>(`/documents/${documentId}`);
        return Boolean(doc.bookmarked);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          return false;
        }
        throw err;
      }
    },
    enabled: loggedIn && bookmarkedProp === undefined,
    retry: false,
    staleTime: 30_000,
  });

  const bookmarked = bookmarkedProp ?? status.data ?? false;

  const sharedClass = cn(
    'min-h-10 shrink-0 gap-1.5',
    bookmarked &&
      'border-[var(--bookmark)]/40 text-[var(--bookmark-fg)] hover:border-[var(--bookmark)] hover:bg-[var(--bookmark-soft)]',
    className,
  );

  if (!loggedIn) {
    return (
      <Link
        href={loginHref}
        className={cn(buttonVariants({ variant: 'outline', size }), sharedClass)}
      >
        <Bookmark className="size-4" aria-hidden />
        Save PDF
      </Link>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        loading={bookmarkedProp === undefined && status.isLoading}
        className={sharedClass}
        aria-label={bookmarked ? 'Manage saved PDF' : 'Save PDF'}
        onClick={() => setPickerOpen(true)}
      >
        <Bookmark className="size-4" aria-hidden fill={bookmarked ? 'currentColor' : 'none'} />
        {bookmarked ? 'Saved' : 'Save PDF'}
      </Button>
      <SaveToCollectionDialog
        open={pickerOpen}
        documentId={documentId}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}
