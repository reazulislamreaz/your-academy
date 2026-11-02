'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api/client';

type BookmarkRow = {
  id: string;
  question: { id: string; title: string; difficulty: string; category: { name: string } };
};

export default function BookmarksPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => apiFetch<BookmarkRow[]>('/bookmarks/questions'),
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
      {error ? (
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
            <Link href="/questions" className="text-sm font-semibold text-[var(--ink)] underline-offset-2 hover:underline">
              Browse questions
            </Link>
          }
        />
      ) : null}
      <div className="grid gap-3">
        {data?.map((b) => (
          <Link
            key={b.id}
            href={`/questions/${b.question.id}`}
            className="flex items-start justify-between gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4"
          >
            <div>
              <p className="font-semibold">{b.question.title}</p>
              <p className="text-sm text-[var(--muted)]">{b.question.category.name}</p>
            </div>
            <Badge variant="outline">{b.question.difficulty}</Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
