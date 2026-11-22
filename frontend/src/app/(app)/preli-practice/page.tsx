import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LearnerPage } from '@/components/layout/learner-page';
import { PageHeader } from '@/components/layout/page-header';
import { ListCardSkeleton } from '@/components/loading/list-card-skeleton';
import { PublicQuestionBank } from '@/features/public-question-bank/public-question-bank';

export const metadata: Metadata = {
  title: 'Preli Practice',
  description: 'Timed preliminary MCQ practice from published question sets.',
};

function PreliPracticeContent() {
  return (
    <LearnerPage dense>
      <PageHeader
        eyebrow="Practice"
        title="Preli Practice"
        description="Choose a preliminary set, set your own exam time, and take a timed practice — no name entry needed."
      />
      <PublicQuestionBank basePath="/preli-practice" embedded timedPractice />
    </LearnerPage>
  );
}

/** Practice — timed Preli exams (Model Test–style flow). */
export default function PreliPracticePage() {
  return (
    <Suspense
      fallback={
        <LearnerPage dense>
          <PageHeader eyebrow="Practice" title="Preli Practice" />
          <ListCardSkeleton rows={5} />
        </LearnerPage>
      }
    >
      <PreliPracticeContent />
    </Suspense>
  );
}
