'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { apiFetch } from '@/lib/api/client';
import type { CategoryNode } from '@/lib/api/types';

export default function SubjectsPage() {
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories'),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Prepare"
        title="Subject-wise practice"
        description="Pick a subject, open a topic, then practice MCQs or start a subject quiz."
      />

      {categories.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : null}

      {categories.isError ? (
        <Alert variant="danger">Could not load subjects.</Alert>
      ) : null}

      {!categories.isLoading && !categories.isError && (categories.data?.length ?? 0) === 0 ? (
        <EmptyState title="No subjects yet" description="Subjects appear once categories are published." />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(categories.data ?? []).map((subject) => (
          <Surface key={subject.id} className="p-4">
            <h2 className="font-display text-lg font-semibold text-[var(--ink)]">
              <Link
                href={`/subjects/${subject.slug}`}
                className="hover:text-[var(--highlight)]"
              >
                {subject.name}
              </Link>
            </h2>
            {subject.description ? (
              <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{subject.description}</p>
            ) : null}
            <p className="mt-3 text-xs text-[var(--muted-strong)]">
              {subject.children.length} topic{subject.children.length === 1 ? '' : 's'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/questions?categoryId=${subject.id}`}
                className="text-sm font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
              >
                MCQs
              </Link>
              <span className="text-[var(--line)]">·</span>
              <Link
                href={`/quizzes?categoryId=${subject.id}`}
                className="text-sm font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
              >
                Quizzes
              </Link>
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}
