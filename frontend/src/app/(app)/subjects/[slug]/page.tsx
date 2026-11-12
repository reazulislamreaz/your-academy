'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { PracticeSetList } from '@/components/practice/practice-set-list';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Surface } from '@/components/ui/surface';
import { apiFetch } from '@/lib/api/client';
import type { CategoryNode } from '@/lib/api/types';
import { SubjectDetailPageSkeleton } from '@/components/skeletons';

export default function SubjectDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories'),
  });

  const subject = categories.data?.find((c) => c.slug === slug);

  if (categories.isLoading) {
    return <SubjectDetailPageSkeleton />;
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
        {subject.children.length === 0 ? (
          <EmptyState
            title="No topics yet"
            description="Topic-level practice appears once subcategories are published for this subject."
            action={
              <div className="flex flex-wrap gap-3 text-sm">
                <Link
                  href={`/questions?categoryId=${subject.id}`}
                  className="font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
                >
                  Practice subject MCQs
                </Link>
                <Link
                  href={`/quizzes?categoryId=${subject.id}`}
                  className="font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
                >
                  Subject quizzes
                </Link>
              </div>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {subject.children.map((topic) => (
              <Surface elevated key={topic.id} className="p-4">
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
        )}
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
