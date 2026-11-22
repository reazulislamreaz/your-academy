'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { LearnerPage, LearnerSection } from '@/components/layout/learner-page';
import { PageHeader } from '@/components/layout/page-header';
import { PracticeSetList } from '@/components/practice/practice-set-list';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
    <LearnerPage dense>
      <PageHeader
        eyebrow="Subject"
        title={subject.name}
        description={subject.description ?? 'Topic-wise MCQs and subject quizzes.'}
        actions={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Link href={`/questions?categoryId=${subject.id}`} className="min-w-0">
              <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                All MCQs
              </Button>
            </Link>
            <Link href="/live-quizzes" className="min-w-0">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                Quiz
              </Button>
            </Link>
          </div>
        }
      />

      <LearnerSection title="Topics">
        {subject.children.length === 0 ? (
          <EmptyState
            title="No topics yet"
            description="Topic-level practice appears once subcategories are published for this subject."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {subject.children.map((topic) => (
              <Surface key={topic.id} elevated className="flex flex-col gap-3 overflow-x-clip p-3.5 sm:p-4">
                <h3 className="break-words font-medium text-[var(--ink)]">{topic.name}</h3>
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <Link
                    href={`/questions?categoryId=${subject.id}&subcategoryId=${topic.id}`}
                  >
                    <Button variant="secondary" size="sm" className="w-full">
                      MCQs
                    </Button>
                  </Link>
                  <Link href="/live-quizzes">
                    <Button variant="outline" size="sm" className="w-full">
                      Quiz
                    </Button>
                  </Link>
                </div>
              </Surface>
            ))}
          </div>
        )}
      </LearnerSection>

      <LearnerSection title="Subject quizzes">
        <PracticeSetList
          kind="SUBJECT_QUIZ"
          categoryId={subject.id}
          emptyTitle="No subject quizzes"
          emptyDescription="Admin-published subject quizzes for this subject will show here."
        />
      </LearnerSection>
    </LearnerPage>
  );
}
