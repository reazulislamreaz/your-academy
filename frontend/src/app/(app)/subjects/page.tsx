'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { LearnerPage } from '@/components/layout/learner-page';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Surface } from '@/components/ui/surface';
import { apiFetch } from '@/lib/api/client';
import type { CategoryNode } from '@/lib/api/types';
import { SubjectsPageSkeleton } from '@/components/skeletons';
import { ContentIn } from '@/components/ui/skeleton';

export default function SubjectsPage() {
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories'),
  });

  return (
    <LearnerPage>
      <PageHeader
        eyebrow="Prepare"
        title="Subject-wise practice"
        description="Pick a subject, open a topic, then practice MCQs or start a subject quiz."
      />

      {categories.isLoading ? <SubjectsPageSkeleton omitHeader /> : null}

      {categories.isError ? (
        <Alert variant="danger">Could not load subjects.</Alert>
      ) : null}

      {!categories.isLoading && !categories.isError && (categories.data?.length ?? 0) === 0 ? (
        <EmptyState title="No subjects yet" description="Subjects appear once categories are published." />
      ) : null}

      {!categories.isLoading && !categories.isError && (categories.data?.length ?? 0) > 0 ? (
        <ContentIn className="motion-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(categories.data ?? []).map((subject) => (
            <Surface key={subject.id} elevated interactive className="flex flex-col p-4 sm:p-5">
              <Link href={`/subjects/${subject.slug}`} className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-semibold tracking-tight text-[var(--ink)] hover:text-[var(--highlight)]">
                  {subject.name}
                </h2>
                {subject.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{subject.description}</p>
                ) : null}
                <p className="mt-3 text-xs text-[var(--muted)]">
                  {subject.children.length} topic{subject.children.length === 1 ? '' : 's'}
                </p>
              </Link>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link href={`/questions?categoryId=${subject.id}`}>
                  <Button variant="secondary" size="sm" className="w-full">
                    MCQs
                  </Button>
                </Link>
                <Link href={`/quizzes?categoryId=${subject.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    Quizzes
                  </Button>
                </Link>
              </div>
            </Surface>
          ))}
        </ContentIn>
      ) : null}
    </LearnerPage>
  );
}
