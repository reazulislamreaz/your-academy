'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { PracticeSetList } from '@/components/practice/practice-set-list';
import { Alert } from '@/components/ui/alert';
import { ContentCardSkeleton } from '@/components/skeletons';
import { examLabel } from '@/lib/exam-tags';

function PreviousYearContent() {
  const examTag = useSearchParams().get('examTag') ?? undefined;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Collections"
        title={
          examTag ? `${examLabel(examTag)} previous-year style` : 'Previous-year style sets'
        }
        description="Demo practice collections styled after previous-year workflows. Synthetic items are labeled in question source notes."
      />
      <Alert>
        These seed collections are original demo content for workflow testing — not official exam
        papers.
      </Alert>
      <PracticeSetList
        kind="PREVIOUS_YEAR_SET"
        examTag={examTag}
        emptyTitle="No previous-year style sets"
        emptyDescription="Admin-published previous-year style collections will appear here."
      />
    </div>
  );
}

export default function PreviousYearPage() {
  return (
    <Suspense
      fallback={
        <div className="grid gap-3 sm:grid-cols-2">
          <ContentCardSkeleton />
          <ContentCardSkeleton />
        </div>
      }
    >
      <PreviousYearContent />
    </Suspense>
  );
}
