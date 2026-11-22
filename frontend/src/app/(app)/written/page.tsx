import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LearnerPage } from '@/components/layout/learner-page';
import { PageHeader } from '@/components/layout/page-header';
import { ListCardSkeleton } from '@/components/loading/list-card-skeleton';
import { WrittenQuestionBank } from '@/features/written-question-bank/public-question-bank';

export const metadata: Metadata = {
  title: 'Written Questions',
  description: 'Browse written exam question sets from your dashboard.',
};

function WrittenContent() {
  return (
    <LearnerPage dense>
      <PageHeader
        eyebrow="Learning"
        title="Written Questions"
        description="Browse written exam collections by topic and year — separate from preliminary MCQs."
      />
      <WrittenQuestionBank basePath="/written" embedded />
    </LearnerPage>
  );
}

/** Learning — Written bank (same public sets as `/written-question-bank`, DEC-040). */
export default function WrittenQuestionsPage() {
  return (
    <Suspense
      fallback={
        <LearnerPage dense>
          <PageHeader eyebrow="Learning" title="Written Questions" />
          <ListCardSkeleton rows={4} rowClassName="min-h-24 py-5" />
        </LearnerPage>
      }
    >
      <WrittenContent />
    </Suspense>
  );
}
