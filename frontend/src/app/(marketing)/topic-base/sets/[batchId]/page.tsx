import type { Metadata } from 'next';
import { TopicSetView } from '@/features/topic-base/topic-set-view';

type Props = { params: Promise<{ batchId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { batchId } = await params;
  return {
    title: 'Topic collection — Topic Base Question Analysis — Your Academy',
    description: `Browse Topic Base questions for collection ${batchId}.`,
  };
}

export default async function TopicSetPage({ params }: Props) {
  const { batchId } = await params;
  return (
    <main className="marketing-container section-pad">
      <TopicSetView batchId={batchId} />
    </main>
  );
}
