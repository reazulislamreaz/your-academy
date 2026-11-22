import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LearnerPage } from '@/components/layout/learner-page';
import { PageHeader } from '@/components/layout/page-header';
import { ListCardSkeleton } from '@/components/loading/list-card-skeleton';
import { PublicQuestionBank } from '@/features/public-question-bank/public-question-bank';

export const metadata: Metadata = {
  title: 'Preli Questions',
  description: 'Browse preliminary question sets and study MCQs from your dashboard.',
};

function PreliQuestionsContent() {
  return (
    <LearnerPage dense>
      <PageHeader
        eyebrow="Learning"
        title="Preli Questions"
        description="Browse published preliminary collections by subject, topic, and year. Open any set to study questions."
      />
      <PublicQuestionBank basePath="/preli-questions" embedded />
    </LearnerPage>
  );
}

/** Learning — browse Preli bank (same sets as `/preli-question-bank`, no timer). */
export default function PreliQuestionsPage() {
  return (
    <Suspense
      fallback={
        <LearnerPage dense>
          <PageHeader eyebrow="Learning" title="Preli Questions" />
          <ListCardSkeleton rows={5} />
        </LearnerPage>
      }
    >
      <PreliQuestionsContent />
    </Suspense>
  );
}
