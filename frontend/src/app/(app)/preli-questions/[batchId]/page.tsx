import type { Metadata } from 'next';
import { LearnerPage } from '@/components/layout/learner-page';
import { PublicQuestionSetView } from '@/features/public-question-bank/public-question-set-view';

type Props = { params: Promise<{ batchId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { batchId } = await params;
  return {
    title: 'Preli question set',
    description: `Preliminary question set ${batchId}.`,
  };
}

/** Learning — browse a Preli set (study mode with answer visibility). */
export default async function PreliQuestionSetPage({ params }: Props) {
  const { batchId } = await params;
  return (
    <LearnerPage dense>
      <PublicQuestionSetView setId={batchId} basePath="/preli-questions" embedded />
    </LearnerPage>
  );
}
