'use client';

import Link from 'next/link';
import { useMutation, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Folder, FolderOpen, FolderPlus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { isUnauthorized } from '@/features/auth/use-auth';
import { apiFetch, apiFetchResult } from '@/lib/api/client';
import type { BookmarkCollectionsPayload } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { BookmarksPageSkeleton } from '@/components/skeletons';

type Tab = 'questions' | 'documents';
type FolderFilter = 'all' | 'uncategorized' | string;

type QuestionBookmarkRow = {
  id: string;
  collectionId?: string | null;
  collection?: { id: string; name: string } | null;
  question: { id: string; title: string; difficulty: string; category: { name: string } };
};

type DocumentBookmarkRow = {
  id: string;
  document: { id: string; title: string; visibility: string };
};

export default function BookmarksPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('questions');
  const [folder, setFolder] = useState<FolderFilter>('all');
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const collections = useQuery({
    queryKey: ['bookmark-collections'],
    queryFn: () => apiFetch<BookmarkCollectionsPayload>('/bookmarks/collections'),
    enabled: tab === 'questions',
  });

  const collectionQuery =
    folder === 'all'
      ? ''
      : folder === 'uncategorized'
        ? '&collectionId=uncategorized'
        : `&collectionId=${encodeURIComponent(folder)}`;

  const questions = useInfiniteQuery({
    queryKey: ['bookmarks', 'questions', folder],
    queryFn: ({ pageParam }) =>
      apiFetchResult<QuestionBookmarkRow[]>(
        `/bookmarks/questions?limit=20${collectionQuery}${pageParam ? `&cursor=${pageParam}` : ''}`,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
    retry: false,
    enabled: tab === 'questions',
  });

  const documents = useInfiniteQuery({
    queryKey: ['bookmarks', 'documents'],
    queryFn: ({ pageParam }) =>
      apiFetchResult<DocumentBookmarkRow[]>(
        `/bookmarks/documents?limit=20${pageParam ? `&cursor=${pageParam}` : ''}`,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
    retry: false,
    enabled: tab === 'documents',
  });

  const removeQuestion = useMutation({
    mutationFn: (questionId: string) =>
      apiFetch(`/bookmarks/questions/${questionId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['bookmarks'] });
      void qc.invalidateQueries({ queryKey: ['bookmark-collections'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const removeDocument = useMutation({
    mutationFn: (documentId: string) =>
      apiFetch(`/bookmarks/documents/${documentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });

  const createFolder = useMutation({
    mutationFn: (name: string) =>
      apiFetch('/bookmarks/collections', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      setNewFolderName('');
      setCreatingFolder(false);
      void qc.invalidateQueries({ queryKey: ['bookmark-collections'] });
    },
  });

  const deleteFolder = useMutation({
    mutationFn: (id: string) => apiFetch(`/bookmarks/collections/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      if (folder === id) setFolder('all');
      setDeleteTarget(null);
      void qc.invalidateQueries({ queryKey: ['bookmark-collections'] });
      void qc.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });

  const moveQuestion = useMutation({
    mutationFn: ({
      questionId,
      collectionId,
    }: {
      questionId: string;
      collectionId: string | null;
    }) =>
      apiFetch(`/bookmarks/questions/${questionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ collectionId }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['bookmarks'] });
      void qc.invalidateQueries({ queryKey: ['bookmark-collections'] });
    },
  });

  const active = tab === 'questions' ? questions : documents;
  const questionRows = useMemo(
    () => questions.data?.pages.flatMap((p) => p.data) ?? [],
    [questions.data],
  );
  const documentRows = useMemo(
    () => documents.data?.pages.flatMap((p) => p.data) ?? [],
    [documents.data],
  );

  const folderOptions = collections.data?.items ?? [];
  const activeFolderLabel =
    folder === 'all'
      ? 'All saved'
      : folder === 'uncategorized'
        ? 'Uncategorized'
        : (folderOptions.find((c) => c.id === folder)?.name ?? 'Folder');

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Library"
        title="Questions & PDFs"
        description="Organize saved MCQs into folders. PDFs stay in a simple list."
      />

      <div
        className="inline-flex rounded-full border border-[var(--line)] bg-[var(--bg-elevated)] p-1 shadow-[var(--shadow-sm)]"
        role="tablist"
        aria-label="Saved item types"
      >
        {(
          [
            { id: 'questions', label: 'Questions' },
            { id: 'documents', label: 'PDFs' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`bookmarks-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`bookmarks-panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
            className={cn(
              'cursor-pointer rounded-full px-5 py-2 text-sm font-semibold transition-all duration-[var(--duration-fast)]',
              tab === item.id
                ? 'bg-[var(--accent)] text-[var(--accent-fg,#fff)] shadow-sm'
                : 'text-[var(--muted-strong)] hover:text-[var(--ink)]',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {active.isLoading ? <BookmarksPageSkeleton omitChrome /> : null}

      {isUnauthorized(active.error) ? (
        <Alert variant="warning">
          Sign in to view bookmarks.{' '}
          <Link href="/login?next=/bookmarks" className="font-semibold underline-offset-2 hover:underline">
            Sign in
          </Link>
        </Alert>
      ) : null}

      {active.isError && !isUnauthorized(active.error) ? (
        <Alert variant="danger">Could not load bookmarks. Try again shortly.</Alert>
      ) : null}

      {tab === 'questions' && !questions.isLoading && !questions.error ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,15.5rem)_minmax(0,1fr)] lg:gap-7">
          <aside className="rounded-[1.15rem] border border-[var(--line)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-sm)] lg:sticky lg:top-24 lg:self-start">
            <p className="mb-2.5 px-2.5 text-[0.6875rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
              Folders
            </p>
            <div className="space-y-0.5">
              <FolderNavButton
                active={folder === 'all'}
                label="All saved"
                count={
                  (collections.data?.uncategorized.questionCount ?? 0) +
                  folderOptions.reduce((sum, c) => sum + c.questionCount, 0)
                }
                onClick={() => setFolder('all')}
              />
              {folderOptions.map((c) => (
                <div key={c.id} className="group flex items-center gap-0.5">
                  <FolderNavButton
                    className="min-w-0 flex-1"
                    active={folder === c.id}
                    label={c.name}
                    count={c.questionCount}
                    onClick={() => setFolder(c.id)}
                  />
                  <button
                    type="button"
                    aria-label={`Delete folder ${c.name}`}
                    className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--muted)] opacity-0 transition-all hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] group-hover:opacity-100 focus-visible:opacity-100"
                    disabled={deleteFolder.isPending}
                    onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </div>
              ))}
            </div>

            {creatingFolder ? (
              <form
                className="mt-3 space-y-2 border-t border-[var(--line)] px-1 pt-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = newFolderName.trim();
                  if (!name) return;
                  createFolder.mutate(name);
                }}
              >
                <Input
                  value={newFolderName}
                  maxLength={80}
                  placeholder="Folder name"
                  autoFocus
                  disabled={createFolder.isPending}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="h-9 rounded-lg"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="flex-1 cursor-pointer rounded-lg"
                    onClick={() => {
                      setCreatingFolder(false);
                      setNewFolderName('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="flex-1 cursor-pointer rounded-lg"
                    disabled={createFolder.isPending || !newFolderName.trim()}
                  >
                    Create
                  </Button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                className="mt-3 flex w-full cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[var(--line)] px-2.5 py-2.5 text-left text-sm font-medium text-[var(--muted-strong)] transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]"
                onClick={() => setCreatingFolder(true)}
              >
                <FolderPlus className="size-4 shrink-0" aria-hidden />
                New folder
              </button>
            )}
          </aside>

          <div className="min-w-0 space-y-3">
            <div className="flex items-baseline justify-between gap-3 px-0.5">
              <h2 className="font-display text-base font-bold tracking-tight text-[var(--ink)]">
                {activeFolderLabel}
              </h2>
              <p className="text-xs tabular-nums text-[var(--muted-strong)]">
                {questionRows.length}
                {questions.hasNextPage ? '+' : ''}{' '}
                {questionRows.length === 1 ? 'question' : 'questions'}
              </p>
            </div>

            {questionRows.length === 0 ? (
              <EmptyState
                title="No saved questions here"
                description="Save an MCQ from its detail page and pick a folder."
                action={
                  <Link
                    href="/questions"
                    className="text-sm font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
                  >
                    Browse questions
                  </Link>
                }
              />
            ) : (
              <ul
                role="tabpanel"
                id="bookmarks-panel-questions"
                aria-labelledby="bookmarks-tab-questions"
                className="space-y-2.5"
              >
                {questionRows.map((b) => (
                  <li key={b.id}>
                    <article className="group rounded-[1rem] border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-4 shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-fast)] hover:-translate-y-0.5 hover:border-[var(--accent)]/30 hover:shadow-[var(--shadow)] sm:px-5">
                      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <Link
                          href={`/questions/${b.question.id}`}
                          className="min-w-0 flex-1 space-y-1"
                        >
                          <p className="font-display text-[0.95rem] leading-snug font-semibold tracking-tight text-[var(--ink)] transition-colors group-hover:text-[var(--highlight)] sm:text-base">
                            {b.question.title}
                          </p>
                          <p className="text-sm text-[var(--muted-strong)]">
                            {b.question.category.name}
                          </p>
                        </Link>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <label className="sr-only" htmlFor={`move-${b.id}`}>
                            Move to folder
                          </label>
                          <Select
                            id={`move-${b.id}`}
                            className="h-9 w-full min-w-[9.5rem] rounded-full border-[var(--line)] bg-[var(--bg-muted)] px-3.5 pr-9 text-xs font-medium shadow-none sm:w-auto sm:max-w-[11rem]"
                            value={b.collection?.id ?? 'uncategorized'}
                            disabled={moveQuestion.isPending}
                            onChange={(e) => {
                              const value = e.target.value;
                              moveQuestion.mutate({
                                questionId: b.question.id,
                                collectionId: value === 'uncategorized' ? null : value,
                              });
                            }}
                          >
                            <option value="uncategorized">No folder</option>
                            {folderOptions.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 cursor-pointer rounded-full px-3 text-[var(--muted-strong)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                            disabled={removeQuestion.isPending}
                            onClick={() => removeQuestion.mutate(b.question.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {tab === 'documents' && !documents.isLoading && !documents.error && documentRows.length === 0 ? (
        <EmptyState
          title="No saved PDFs"
          description="Bookmark a document from the PDF library to keep it here."
          action={
            <Link
              href="/documents"
              className="text-sm font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
            >
              Browse PDFs
            </Link>
          }
        />
      ) : null}

      {tab === 'documents' && documentRows.length > 0 ? (
        <ul
          role="tabpanel"
          id="bookmarks-panel-documents"
          aria-labelledby="bookmarks-tab-documents"
          className="space-y-2.5"
        >
          {documentRows.map((b) => (
            <li key={b.id}>
              <article className="group flex items-center justify-between gap-3 rounded-[1rem] border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-4 shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-fast)] hover:-translate-y-0.5 hover:border-[var(--accent)]/30 hover:shadow-[var(--shadow)] sm:px-5">
                <Link href={`/documents/${b.document.id}`} className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--info-soft)] text-[var(--info)]">
                    <FileText className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <p className="font-display text-[0.95rem] leading-snug font-semibold tracking-tight text-[var(--ink)] transition-colors group-hover:text-[var(--highlight)] sm:text-base">
                      {b.document.title}
                    </p>
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 shrink-0 cursor-pointer rounded-full px-3 text-[var(--muted-strong)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                  disabled={removeDocument.isPending}
                  onClick={() => removeDocument.mutate(b.document.id)}
                >
                  Remove
                </Button>
              </article>
            </li>
          ))}
        </ul>
      ) : null}

      {active.hasNextPage ? (
        <div className="flex justify-center pt-1">
          <Button
            variant="outline"
            className="cursor-pointer rounded-full px-6"
            disabled={active.isFetchingNextPage}
            onClick={() => void active.fetchNextPage()}
          >
            {active.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete folder?"
        description={
          deleteTarget
            ? `Delete “${deleteTarget.name}”? Questions in it remain under All saved.`
            : null
        }
        confirmLabel="Delete folder"
        destructive
        reversible
        pending={deleteFolder.isPending}
        onCancel={() => {
          if (!deleteFolder.isPending) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) deleteFolder.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}

function FolderNavButton({
  active,
  label,
  count,
  onClick,
  className,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
  className?: string;
}) {
  const Icon = active ? FolderOpen : Folder;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-all duration-[var(--duration-fast)]',
        active
          ? 'bg-[var(--brand-wash-strong)] font-semibold text-[var(--ink)] shadow-sm'
          : 'text-[var(--ink-soft)] hover:bg-[var(--bg-muted)]',
        className,
      )}
    >
      <Icon
        className={cn('size-4 shrink-0', active ? 'text-[var(--highlight)]' : 'text-[var(--muted)]')}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span
        className={cn(
          'rounded-full px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums',
          active
            ? 'bg-[var(--bg-elevated)] text-[var(--ink-soft)]'
            : 'text-[var(--muted-strong)]',
        )}
      >
        {count}
      </span>
    </button>
  );
}
