import type { Metadata } from 'next';
import { LearnerPage } from '@/components/layout/learner-page';
import { WrittenQuestionSetView } from '@/features/written-question-bank/public-question-set-view';

type Props = { params: Promise<{ batchId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { batchId } = await params;
  return {
    title: 'Written set',
    description: `Written question set ${batchId}.`,
  };
}

/** Learner-shell Written set view — stays inside the dashboard shell. */
export default async function WrittenSetPage({ params }: Props) {
  const { batchId } = await params;
  return (
    <LearnerPage dense>
      <WrittenQuestionSetView setId={batchId} basePath="/written" embedded />
    </LearnerPage>
  );
}
