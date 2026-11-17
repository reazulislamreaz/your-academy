'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LearnerPage } from '@/components/layout/learner-page';
import { PageHeader } from '@/components/layout/page-header';
import { PracticeSetList } from '@/components/practice/practice-set-list';
import { examLabel } from '@/lib/exam-tags';
import { PracticeBrowsePageSkeleton } from '@/components/skeletons';

function ModelTestsContent() {
  const examTag = useSearchParams().get('examTag') ?? undefined;

  return (
    <LearnerPage dense>
      <PageHeader
        eyebrow="Mock exams"
        title={examTag ? `${examLabel(examTag)} model tests` : 'Model tests'}
        description="Timed full-length and exam-track model tests with score and review."
      />
      <PracticeSetList
        kind="MODEL_TEST"
        examTag={examTag}
        emptyTitle="No model tests yet"
        emptyDescription="Published model tests will appear here."
      />
    </LearnerPage>
  );
}

export default function ModelTestsPage() {
  return (
    <Suspense fallback={<PracticeBrowsePageSkeleton />}>
      <ModelTestsContent />
    </Suspense>
  );
}
