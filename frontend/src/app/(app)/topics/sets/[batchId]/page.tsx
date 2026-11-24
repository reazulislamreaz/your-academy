import type { Metadata } from 'next';
import { LearnerPage } from '@/components/layout/learner-page';
import { TopicAccessGate } from '@/features/topic-base/topic-access-gate';
import { TopicSetView } from '@/features/topic-base/topic-set-view';

type Props = { params: Promise<{ batchId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { batchId } = await params;
  return {
    title: 'Topic collection',
    description: `Topic Base collection ${batchId}.`,
  };
}

/** Learner-shell Topic Base set view — stays inside the dashboard shell. */
export default async function TopicSetPage({ params }: Props) {
  const { batchId } = await params;
  return (
    <LearnerPage dense>
      <TopicAccessGate>
        <TopicSetView batchId={batchId} topicsBasePath="/topics" />
      </TopicAccessGate>
    </LearnerPage>
  );
}
