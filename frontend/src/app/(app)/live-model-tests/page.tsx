import type { Metadata } from 'next';
import Link from 'next/link';
import { LearnerPage, LearnerSection } from '@/components/layout/learner-page';
import { PageHeader } from '@/components/layout/page-header';
import { PracticeSetList } from '@/components/practice/practice-set-list';
import { Button } from '@/components/ui/button';
import { ModelTestListing } from '@/features/model-tests/model-test-listing';

export const metadata: Metadata = {
  title: 'Model Tests',
  description: 'Take published model tests from your dashboard.',
};

/** Learner Model Tests — live guest sets + authenticated PracticeSet MODEL_TEST (DEC-040/035). */
export default function LiveModelTestsPage() {
  return (
    <LearnerPage dense>
      <PageHeader
        eyebrow="Practice & Learning"
        title="Model Tests"
        description="Full-length timed mocks with score review. Live sets match the public site; practice sets stay on your account."
        actions={
          <Link href="/results">
            <Button variant="outline" size="sm">
              My results
            </Button>
          </Link>
        }
      />

      <ModelTestListing basePath="/live-model-tests" embedded />

      <LearnerSection
        title="Practice model tests"
        description="Account practice sets with answer-sheet review after submit."
      >
        <PracticeSetList
          kind="MODEL_TEST"
          emptyTitle="No practice model tests yet"
          emptyDescription="Published practice model tests will appear here."
        />
      </LearnerSection>
    </LearnerPage>
  );
}
