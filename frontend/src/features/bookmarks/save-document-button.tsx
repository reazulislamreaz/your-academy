'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { ApiError, apiFetch } from '@/lib/api/client';
import { isUnauthorized, useMe } from '@/features/auth/use-auth';
import { cn } from '@/lib/utils';

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
 * Save / unsave a PDF bookmark — same UX pattern as Save MCQ (auth required).
 * Document bookmarks are flat (no collections); see DEC-026 for MCQ folders only.
 */
export function SaveDocumentButton({
  documentId,
  bookmarked: bookmarkedProp,
  className,
  size = 'sm',
  loginNext,
}: Props) {
  const me = useMe();
  const qc = useQueryClient();
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

  const toggle = useMutation({
    mutationFn: async () => {
      if (bookmarked) {
        await apiFetch(`/bookmarks/documents/${documentId}`, { method: 'DELETE' });
        return false;
      }
      await apiFetch('/bookmarks/documents', {
        method: 'POST',
        body: JSON.stringify({ documentId }),
      });
      return true;
    },
    onSuccess: (nextBookmarked) => {
      qc.setQueryData(['document-bookmark', documentId], nextBookmarked);
      qc.setQueryData(['document', documentId], (prev: { bookmarked?: boolean } | undefined) =>
        prev ? { ...prev, bookmarked: nextBookmarked } : prev,
      );
      void qc.invalidateQueries({ queryKey: ['bookmarks'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });

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
    <Button
      type="button"
      variant="outline"
      size={size}
      loading={toggle.isPending || (bookmarkedProp === undefined && status.isLoading)}
      disabled={toggle.isPending}
      className={sharedClass}
      onClick={() => toggle.mutate()}
    >
      <Bookmark className="size-4" aria-hidden fill={bookmarked ? 'currentColor' : 'none'} />
      {bookmarked ? 'Saved' : 'Save PDF'}
    </Button>
  );
}
