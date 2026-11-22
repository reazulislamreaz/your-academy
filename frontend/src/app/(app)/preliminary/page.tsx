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

function PreliminaryContent() {
  return (
    <LearnerPage dense>
      <PageHeader
        eyebrow="Practice & Learning"
        title="Preli Practice"
        description="Choose any preliminary question set, set your own exam time, and practice like a Model Test — no name entry needed."
      />
      <PublicQuestionBank basePath="/preliminary" embedded timedPractice />
    </LearnerPage>
  );
}

/** Learner Preli Practice listing — same set cards as the public bank, timed exam entry. */
export default function PreliminaryPracticePage() {
  return (
    <Suspense
      fallback={
        <LearnerPage dense>
          <PageHeader eyebrow="Practice & Learning" title="Preli Practice" />
          <ListCardSkeleton rows={5} />
        </LearnerPage>
      }
    >
      <PreliminaryContent />
    </Suspense>
  );
}
