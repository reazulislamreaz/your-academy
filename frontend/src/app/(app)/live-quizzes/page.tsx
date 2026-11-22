import type { Metadata } from 'next';
import { LearnerPage } from '@/components/layout/learner-page';
import { PageHeader } from '@/components/layout/page-header';
import { QuizListing } from '@/features/guest-exams/quiz-listing';

export const metadata: Metadata = {
  title: 'Quizzes',
  description: 'Take published live quizzes from your dashboard.',
};

/** Learner-shell listing — same public Quizzes as `/exams` (DEC-039). */
export default function LiveQuizzesPage() {
  return (
    <LearnerPage dense>
      <PageHeader
        eyebrow="Live exams"
        title="Quizzes"
        description="Same timed quizzes as the homepage. Start here without leaving your study desk."
      />
      <QuizListing basePath="/live-quizzes" embedded />
    </LearnerPage>
  );
}
