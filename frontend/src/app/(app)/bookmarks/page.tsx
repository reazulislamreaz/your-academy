'use client';

import Link from 'next/link';
import { useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ListRowsSkeleton } from '@/components/skeletons';
import { isUnauthorized } from '@/features/auth/use-auth';
import { apiFetch, apiFetchResult } from '@/lib/api/client';
import { cn } from '@/lib/utils';

type Tab = 'questions' | 'documents';

type QuestionBookmarkRow = {
  id: string;
  question: { id: string; title: string; difficulty: string; category: { name: string } };
};

type DocumentBookmarkRow = {
  id: string;
  document: { id: string; title: string; visibility: string };
};

export default function BookmarksPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('questions');

  const questions = useInfiniteQuery({
    queryKey: ['bookmarks', 'questions'],
    queryFn: ({ pageParam }) =>
      apiFetchResult<QuestionBookmarkRow[]>(
        `/bookmarks/questions?limit=20${pageParam ? `&cursor=${pageParam}` : ''}`,
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
      void qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const removeDocument = useMutation({
    mutationFn: (documentId: string) =>
      apiFetch(`/bookmarks/documents/${documentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['bookmarks'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
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

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Library"
        title="Saved items"
        description="Questions and PDFs you bookmarked while practicing."
      />

      <div className="flex gap-1 border-b border-[var(--line)]">
        {(
          [
            { id: 'questions', label: 'Questions' },
            { id: 'documents', label: 'PDFs' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
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

      {active.isLoading ? <ListRowsSkeleton rows={4} /> : null}

      {isUnauthorized(active.error) ? (
        <Alert variant="warning">
          Sign in to view bookmarks.{' '}
          <Link href="/login" className="font-semibold underline-offset-2 hover:underline">
            Sign in
          </Link>
        </Alert>
      ) : null}

      {tab === 'questions' && !questions.isLoading && !questions.error && questionRows.length === 0 ? (
        <EmptyState
          title="No saved questions"
          description="Save a question from its detail page to see it here."
          action={
            <Link
              href="/questions"
              className="text-sm font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
            >
              Browse questions
            </Link>
          }
        />
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

      {tab === 'questions' ? (
        <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {questionRows.map((b) => (
            <div key={b.id} className="flex items-start justify-between gap-3 py-4">
              <Link href={`/questions/${b.question.id}`} className="min-w-0 flex-1 space-y-1">
                <p className="font-medium text-[var(--ink)]">{b.question.title}</p>
                <p className="text-sm text-[var(--muted-strong)]">{b.question.category.name}</p>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline">{b.question.difficulty}</Badge>
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
      ) : (
        <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
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
      )}

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
