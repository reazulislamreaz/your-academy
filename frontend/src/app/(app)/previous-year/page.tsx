'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LearnerPage } from '@/components/layout/learner-page';
import { PageHeader } from '@/components/layout/page-header';
import { PracticeSetList } from '@/components/practice/practice-set-list';
import { examLabel } from '@/lib/exam-tags';
import { PracticeBrowsePageSkeleton } from '@/components/skeletons';

function PreviousYearContent() {
  const examTag = useSearchParams().get('examTag') ?? undefined;

  return (
    <LearnerPage dense>
      <PageHeader
        eyebrow="Collections"
        title={
          examTag ? `${examLabel(examTag)} previous-year style` : 'Previous-year style sets'
        }
        description="Previous-year style practice collections published by admins."
      />
      <PracticeSetList
        kind="PREVIOUS_YEAR_SET"
        examTag={examTag}
        emptyTitle="No previous-year style sets"
        emptyDescription="Admin-published previous-year style collections will appear here."
      />
    </LearnerPage>
  );
}

export default function PreviousYearPage() {
  return (
    <Suspense fallback={<PracticeBrowsePageSkeleton />}>
      <PreviousYearContent />
    </Suspense>
  );
}
