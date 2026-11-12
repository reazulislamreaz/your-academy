'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { PracticeSetList } from '@/components/practice/practice-set-list';
import { PracticeBrowsePageSkeleton } from '@/components/skeletons';

function QuizzesContent() {
  const sp = useSearchParams();
  const categoryId = sp.get('categoryId') ?? undefined;
  const subcategoryId = sp.get('subcategoryId') ?? undefined;
  const kind = subcategoryId ? 'TOPIC_QUIZ' : categoryId ? 'SUBJECT_QUIZ' : undefined;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Quiz center"
        title="Quizzes"
        description="Daily, subject, and topic quizzes with instant scoring after submit."
      />

      {kind ? (
        <PracticeSetList
          kind={kind}
          categoryId={categoryId}
          subcategoryId={subcategoryId}
          emptyTitle="No matching quizzes"
          emptyDescription="Try clearing filters or open the full quiz center."
        />
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="font-display text-base font-bold tracking-tight text-[var(--ink)]">Daily quizzes</h2>
            <PracticeSetList kind="DAILY_QUIZ" isDaily />
          </section>
          <section className="space-y-3">
            <h2 className="font-display text-base font-bold tracking-tight text-[var(--ink)]">Subject quizzes</h2>
            <PracticeSetList kind="SUBJECT_QUIZ" />
          </section>
          <section className="space-y-3">
            <h2 className="font-display text-base font-bold tracking-tight text-[var(--ink)]">Topic quizzes</h2>
            <PracticeSetList kind="TOPIC_QUIZ" />
          </section>
        </div>
      )}
    </div>
  );
}

export default function QuizzesPage() {
  return (
    <Suspense
      fallback={<PracticeBrowsePageSkeleton />}
    >
      <QuizzesContent />
    </Suspense>
  );
}
