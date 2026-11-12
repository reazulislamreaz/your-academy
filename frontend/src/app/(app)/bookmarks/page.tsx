'use client';

import Link from 'next/link';
import { useMutation, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Folder, FolderOpen, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
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

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Library"
        title="Saved items"
        description="Organize MCQs into personal folders. PDFs stay in a flat list."
      />

      <div
        className="flex gap-1 border-b border-[var(--line)]"
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
              'relative px-4 py-2.5 text-sm font-semibold transition-colors',
              tab === item.id
                ? 'text-[var(--highlight)]'
                : 'text-[var(--muted-strong)] hover:text-[var(--ink)]',
            )}
          >
            {item.label}
            {tab === item.id ? (
              <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-[var(--highlight)]" />
            ) : null}
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
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="space-y-1 lg:sticky lg:top-24 lg:self-start">
            <p className="mb-2 px-2 text-xs font-semibold tracking-[0.12em] text-[var(--muted-strong)] uppercase">
              Folders
            </p>
            <FolderNavButton
              active={folder === 'all'}
              label="All saved"
              count={
                (collections.data?.uncategorized.questionCount ?? 0) +
                folderOptions.reduce((sum, c) => sum + c.questionCount, 0)
              }
              onClick={() => setFolder('all')}
            />
            <FolderNavButton
              active={folder === 'uncategorized'}
              label="Saved Items"
              count={collections.data?.uncategorized.questionCount ?? 0}
              onClick={() => setFolder('uncategorized')}
            />
            {folderOptions.map((c) => (
              <div key={c.id} className="group flex items-center gap-1">
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
                  className="flex size-8 shrink-0 items-center justify-center rounded-[8px] text-[var(--muted-strong)] opacity-70 hover:bg-[var(--highlight-soft)] hover:text-[var(--highlight)] group-hover:opacity-100"
                  disabled={deleteFolder.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete folder “${c.name}”? Questions stay saved under Saved Items.`,
                      )
                    ) {
                      deleteFolder.mutate(c.id);
                    }
                  }}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </div>
            ))}
            {creatingFolder ? (
              <form
                className="mt-2 space-y-2 px-1"
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
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="flex-1"
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
                    className="flex-1"
                    disabled={createFolder.isPending || !newFolderName.trim()}
                  >
                    Create
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 w-full justify-start"
                onClick={() => setCreatingFolder(true)}
              >
                New folder
              </Button>
            )}
          </aside>

          <div>
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
              <div
                role="tabpanel"
                id="bookmarks-panel-questions"
                aria-labelledby="bookmarks-tab-questions"
                className="divide-y divide-[var(--line)] border-y border-[var(--line)]"
              >
                {questionRows.map((b) => (
                  <div key={b.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                    <Link href={`/questions/${b.question.id}`} className="min-w-0 flex-1 space-y-1">
                      <p className="font-medium text-[var(--ink)]">{b.question.title}</p>
                      <p className="text-sm text-[var(--muted-strong)]">
                        {b.question.category.name}
                        {b.collection ? ` · ${b.collection.name}` : ' · Saved Items'}
                      </p>
                    </Link>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Badge variant="outline">{b.question.difficulty}</Badge>
                      <label className="sr-only" htmlFor={`move-${b.id}`}>
                        Move to folder
                      </label>
                      <select
                        id={`move-${b.id}`}
                        className="h-9 max-w-[10rem] rounded-[var(--radius-sm)] border border-[var(--line)] bg-white px-2 text-xs font-medium text-[var(--ink)]"
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
                        <option value="uncategorized">Saved Items</option>
                        {folderOptions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={removeQuestion.isPending}
                        onClick={() => removeQuestion.mutate(b.question.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
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
        <div
          role="tabpanel"
          id="bookmarks-panel-documents"
          aria-labelledby="bookmarks-tab-documents"
          className="divide-y divide-[var(--line)] border-y border-[var(--line)]"
        >
          {documentRows.map((b) => (
            <div key={b.id} className="flex items-start justify-between gap-3 py-4">
              <Link href={`/documents/${b.document.id}`} className="min-w-0 flex-1 space-y-1">
                <p className="font-medium text-[var(--ink)]">{b.document.title}</p>
                <p className="text-sm text-[var(--muted-strong)]">{b.document.visibility}</p>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                disabled={removeDocument.isPending}
                onClick={() => removeDocument.mutate(b.document.id)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {active.hasNextPage ? (
        <Button
          variant="outline"
          disabled={active.isFetchingNextPage}
          onClick={() => void active.fetchNextPage()}
        >
          {active.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      ) : null}
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
        'flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-sm transition-colors',
        active
          ? 'bg-[var(--brand-wash-strong)] font-semibold text-[var(--ink)]'
          : 'text-[var(--ink-soft)] hover:bg-[var(--bg-muted)]',
        className,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="tabular-nums text-xs text-[var(--muted-strong)]">{count}</span>
    </button>
  );
}
