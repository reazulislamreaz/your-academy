'use client';

import Link from 'next/link';
import { useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
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
        title="Saved"
        description="Questions and PDFs you bookmarked for later study."
      />

      <div className="flex gap-2 border-b border-[var(--line)] pb-3">
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
              'rounded-[var(--radius)] px-3 py-1.5 text-sm font-semibold transition-colors',
              tab === item.id
                ? 'bg-[var(--ink)] text-[var(--bg)]'
                : 'text-[var(--muted)] hover:text-[var(--ink)]',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {active.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : null}

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
              className="text-sm font-semibold text-[var(--ink)] underline-offset-2 hover:underline"
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
              className="text-sm font-semibold text-[var(--ink)] underline-offset-2 hover:underline"
            >
              Browse PDFs
            </Link>
          }
        />
      ) : null}

      {tab === 'questions' ? (
        <div className="grid gap-3">
          {questionRows.map((b) => (
            <div
              key={b.id}
              className="flex items-start justify-between gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4"
            >
              <Link href={`/questions/${b.question.id}`} className="min-w-0 flex-1">
                <p className="font-semibold">{b.question.title}</p>
                <p className="text-sm text-[var(--muted)]">{b.question.category.name}</p>
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
        <div className="grid gap-3">
          {documentRows.map((b) => (
            <div
              key={b.id}
              className="flex items-start justify-between gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4"
            >
              <Link href={`/documents/${b.document.id}`} className="min-w-0 flex-1">
                <p className="font-semibold">{b.document.title}</p>
                <p className="text-sm text-[var(--muted)]">{b.document.visibility}</p>
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
