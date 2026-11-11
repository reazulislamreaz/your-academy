'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { PracticeSetList } from '@/components/practice/practice-set-list';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { ContentCardSkeleton, ListRowsSkeleton } from '@/components/skeletons';
import { Surface } from '@/components/ui/surface';
import { apiFetch } from '@/lib/api/client';
import type { CategoryNode } from '@/lib/api/types';

export default function SubjectDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories'),
  });

  const subject = categories.data?.find((c) => c.slug === slug);

  if (categories.isLoading) {
    return (
      <div className="space-y-4" role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading subject…</span>
        <ContentCardSkeleton />
        <ListRowsSkeleton rows={4} />
      </div>
    );
  }

  if (categories.isError) {
    return <Alert variant="danger">Could not load subject.</Alert>;
  }

  if (!subject) {
    return (
      <EmptyState
        title="Subject not found"
        description="This subject may have been removed."
        action={
          <Link href="/subjects" className="text-sm font-semibold text-[var(--highlight)]">
            Back to subjects
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Subject"
        title={subject.name}
        description={subject.description ?? 'Topic-wise MCQs and subject quizzes.'}
      />

      <section className="space-y-3">
        <h2 className="font-display text-base font-bold text-[var(--ink)]">Topics</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {subject.children.map((topic) => (
            <Surface key={topic.id} className="p-4">
              <h3 className="font-medium text-[var(--ink)]">{topic.name}</h3>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Link
                  href={`/questions?categoryId=${subject.id}&subcategoryId=${topic.id}`}
                  className="font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
                >
                  Practice MCQs
                </Link>
                <Link
                  href={`/quizzes?categoryId=${subject.id}&subcategoryId=${topic.id}`}
                  className="font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
                >
                  Topic quizzes
                </Link>
              </div>
            </Surface>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-base font-bold text-[var(--ink)]">Subject quizzes</h2>
        <PracticeSetList
          kind="SUBJECT_QUIZ"
          categoryId={subject.id}
          emptyTitle="No subject quizzes"
          emptyDescription="Admin-published subject quizzes for this subject will show here."
        />
      </section>
    </div>
  );
}
