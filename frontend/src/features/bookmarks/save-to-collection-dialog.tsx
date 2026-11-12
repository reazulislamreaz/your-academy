'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Folder, FolderPlus, Plus, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, apiFetch } from '@/lib/api/client';
import type {
  BookmarkCollectionsPayload,
  QuestionDetail,
  SaveQuestionBookmarkResult,
} from '@/lib/api/types';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  questionId: string;
  questionTitle?: string;
  onClose: () => void;
};

type SuccessState = {
  folderName: string;
  moved: boolean;
  created: boolean;
};

export function SaveToCollectionDialog({ open, questionId, questionTitle, onClose }: Props) {
  const qc = useQueryClient();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);

  const collections = useQuery({
    queryKey: ['bookmark-collections', questionId],
    queryFn: () =>
      apiFetch<BookmarkCollectionsPayload>(
        `/bookmarks/collections?questionId=${encodeURIComponent(questionId)}`,
      ),
    enabled: open,
  });

  function syncQuestionCache(result: SaveQuestionBookmarkResult) {
    qc.setQueryData<QuestionDetail>(['question', questionId], (prev) =>
      prev
        ? {
            ...prev,
            bookmarked: true,
            collection: result.collection,
          }
        : prev,
    );
    void qc.invalidateQueries({ queryKey: ['bookmarks'] });
    void qc.invalidateQueries({ queryKey: ['bookmark-collections'] });
    void qc.invalidateQueries({ queryKey: ['stats'] });
  }

  const save = useMutation({
    mutationFn: (body: {
      collectionId?: string | null;
      newCollectionName?: string;
    }) =>
      apiFetch<SaveQuestionBookmarkResult>('/bookmarks/questions', {
        method: 'POST',
        body: JSON.stringify({ questionId, ...body }),
      }),
    onSuccess: (result) => {
      setError(null);
      syncQuestionCache(result);
      setSuccess({
        folderName: result.collection?.name ?? 'Quick save',
        moved: result.moved,
        created: result.created,
      });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not save. Try again.');
    },
  });

  const unsave = useMutation({
    mutationFn: () =>
      apiFetch(`/bookmarks/questions/${questionId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.setQueryData<QuestionDetail>(['question', questionId], (prev) =>
        prev ? { ...prev, bookmarked: false, collection: null } : prev,
      );
      void qc.invalidateQueries({ queryKey: ['bookmarks'] });
      void qc.invalidateQueries({ queryKey: ['bookmark-collections'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      setSuccess({ folderName: '', moved: false, created: false });
      onClose();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not remove save.');
    },
  });

  const pending = save.isPending || unsave.isPending;

  useEffect(() => {
    if (!open) {
      setCreating(false);
      setNewName('');
      setError(null);
      setSuccess(null);
      return;
    }
    const prev = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusClose = () => {
      dialogRef.current?.querySelector<HTMLElement>('button[aria-label="Close"]')?.focus();
    };
    const focusId = window.requestAnimationFrame(focusClose);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.cancelAnimationFrame(focusId);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prev?.focus?.();
    };
  }, [open, onClose, pending]);

  useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => onClose(), 1400);
    return () => window.clearTimeout(t);
  }, [success, onClose]);

  if (!open) return null;
  const data = collections.data;
  const rows = [
    ...(data
      ? [
          {
            key: 'uncategorized',
            id: null as string | null,
            name: 'Quick save',
            questionCount: data.uncategorized.questionCount,
            active: Boolean(data.uncategorized.containsQuestion),
          },
          ...data.items.map((c) => ({
            key: c.id,
            id: c.id as string | null,
            name: c.name,
            questionCount: c.questionCount,
            active: Boolean(c.containsQuestion),
          })),
        ]
      : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-[var(--ink)]/40 backdrop-blur-[2px]"
        disabled={pending}
        tabIndex={-1}
        onClick={() => {
          if (!pending) onClose();
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative z-10 flex max-h-[min(36rem,92vh)] w-full flex-col overflow-hidden',
          'rounded-t-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)]',
          'motion-scale-in sm:max-w-md sm:rounded-[var(--radius-xl)]',
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-lg font-bold tracking-tight text-[var(--ink)]">
              Save to
            </h2>
            {questionTitle ? (
              <p className="mt-0.5 truncate text-xs text-[var(--muted-strong)]">{questionTitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--muted-strong)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]"
            disabled={pending}
            onClick={onClose}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {success && success.folderName ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]">
              <Check className="size-7" aria-hidden strokeWidth={2.5} />
            </span>
            <p className="font-display text-lg font-bold text-[var(--ink)]">
              {success.moved ? 'Moved' : 'Saved'}
            </p>
            <p className="text-sm text-[var(--muted-strong)]">
              {success.moved ? 'Moved to' : 'Saved to'}{' '}
              <span className="font-semibold text-[var(--ink)]">{success.folderName}</span>
            </p>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3">
              {collections.isLoading ? (
                <p className="px-3 py-8 text-center text-sm text-[var(--muted-strong)]">
                  Loading folders…
                </p>
              ) : null}
              {collections.isError ? (
                <p className="px-3 py-8 text-center text-sm text-[var(--highlight)]">
                  Could not load folders. Try again.
                </p>
              ) : null}
              {!collections.isLoading && !collections.isError
                ? rows.map((row) => (
                    <button
                      key={row.key}
                      type="button"
                      disabled={pending}
                      onClick={() => save.mutate({ collectionId: row.id })}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-[var(--radius)] px-3 py-3 text-left transition-colors',
                        'hover:bg-[var(--bg-muted)] disabled:opacity-60',
                        row.active && 'bg-[var(--brand-wash)]',
                      )}
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--ink)]">
                        <Folder className="size-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[var(--ink)]">
                          {row.name}
                        </span>
                        <span className="block text-xs text-[var(--muted-strong)]">
                          {row.questionCount}{' '}
                          {row.questionCount === 1 ? 'question' : 'questions'}
                        </span>
                      </span>
                      {row.active ? (
                        <Check className="size-5 shrink-0 text-[var(--highlight)]" aria-hidden />
                      ) : null}
                    </button>
                  ))
                : null}
            </div>

            <div className="border-t border-[var(--line)] px-4 py-3 sm:px-5">
              {creating ? (
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const name = newName.trim();
                    if (!name) return;
                    save.mutate({ newCollectionName: name });
                  }}
                >
                  <label htmlFor="new-collection-name" className="sr-only">
                    New folder name
                  </label>
                  <Input
                    id="new-collection-name"
                    value={newName}
                    maxLength={80}
                    placeholder="Folder name"
                    disabled={pending}
                    autoFocus
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      disabled={pending}
                      onClick={() => {
                        setCreating(false);
                        setNewName('');
                        setError(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={pending || !newName.trim()}
                    >
                      {pending ? 'Saving…' : 'Create & save'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="soft"
                    className="w-full justify-start gap-2"
                    disabled={pending}
                    onClick={() => setCreating(true)}
                  >
                    <FolderPlus className="size-4" aria-hidden />
                    Create new folder
                    <Plus className="ml-auto size-4 opacity-60" aria-hidden />
                  </Button>
                  {data?.bookmarked ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-[var(--highlight)]"
                      disabled={pending}
                      onClick={() => unsave.mutate()}
                    >
                      Remove from saved
                    </Button>
                  ) : null}
                </div>
              )}
              {error ? (
                <p className="mt-2 text-center text-xs font-medium text-[var(--highlight)]" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
