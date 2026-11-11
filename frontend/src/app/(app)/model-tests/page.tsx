'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { PracticeSetList } from '@/components/practice/practice-set-list';
import { Skeleton } from '@/components/ui/skeleton';
import { examLabel } from '@/lib/exam-tags';

function ModelTestsContent() {
  const examTag = useSearchParams().get('examTag') ?? undefined;

  return (
    <div className="space-y-8">
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
    </div>
  );
}

export default function ModelTestsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-40 w-full" />}>
      <ModelTestsContent />
    </Suspense>
  );
}
