import type { Metadata } from 'next';
import Link from 'next/link';
import { LearnerPage } from '@/components/layout/learner-page';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { QuizListing } from '@/features/guest-exams/quiz-listing';

export const metadata: Metadata = {
  title: 'Exams',
  description: 'Take published timed exams from your dashboard.',
};

/** Learner-shell listing — same public Quizzes/Exams as `/exams` (DEC-039). */
export default function LiveQuizzesPage() {
  return (
    <LearnerPage dense>
      <PageHeader
        eyebrow="Practice & Learning"
        title="Exams"
        description="Timed public exams with instant scoring after submit. Results stay in your account history."
        actions={
          <Link href="/results">
            <Button variant="outline" size="sm">
              My results
            </Button>
          </Link>
        }
      />
      <QuizListing basePath="/live-quizzes" embedded />
    </LearnerPage>
  );
}
