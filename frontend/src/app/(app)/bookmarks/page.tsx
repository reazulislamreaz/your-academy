'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { isUnauthorized } from '@/features/auth/use-auth';
import { apiFetch } from '@/lib/api/client';

type BookmarkRow = {
  id: string;
  question: { id: string; title: string; difficulty: string; category: { name: string } };
};

export default function BookmarksPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => apiFetch<BookmarkRow[]>('/bookmarks/questions'),
    retry: false,
  });

  const remove = useMutation({
    mutationFn: (questionId: string) =>
      apiFetch(`/bookmarks/questions/${questionId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['bookmarks'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Saved questions" description="Questions you bookmarked for later." />
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : null}
      {isUnauthorized(error) ? (
        <Alert variant="warning">
          Sign in to view bookmarks.{' '}
          <Link href="/login" className="font-semibold underline-offset-2 hover:underline">
            Sign in
          </Link>
        </Alert>
      ) : null}
      {!isLoading && !error && data?.length === 0 ? (
        <EmptyState
          title="No bookmarks yet"
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
      <div className="grid gap-3">
        {data?.map((b) => (
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
                disabled={remove.isPending}
                onClick={() => remove.mutate(b.question.id)}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
