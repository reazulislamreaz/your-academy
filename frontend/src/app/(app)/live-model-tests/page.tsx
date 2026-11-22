import type { Metadata } from 'next';
import { LearnerPage } from '@/components/layout/learner-page';
import { PageHeader } from '@/components/layout/page-header';
import { ModelTestListing } from '@/features/model-tests/model-test-listing';

export const metadata: Metadata = {
  title: 'Model tests',
  description: 'Take published model tests from your dashboard.',
};

/** Learner-shell listing — same public Model Tests as `/model-test` (DEC-040). */
export default function LiveModelTestsPage() {
  return (
    <LearnerPage dense>
      <PageHeader
        eyebrow="Live exams"
        title="Model tests"
        description="Same timed model tests as the homepage. Start here without leaving your study desk."
      />
      <ModelTestListing basePath="/live-model-tests" embedded />
    </LearnerPage>
  );
}
