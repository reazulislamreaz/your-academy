import type { Metadata } from 'next';
import { TopicQuestionView } from '@/features/topic-base/topic-question-view';

type Props = { params: Promise<{ subcategoryId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subcategoryId } = await params;
  return {
    title: 'Topic questions — Topic Base Question Analysis — Your Academy',
    description: `Browse Topic Base questions for topic ${subcategoryId}.`,
  };
}

export default async function TopicBasePage({ params }: Props) {
  const { subcategoryId } = await params;
  return (
    <main className="marketing-container section-pad">
      <TopicQuestionView subcategoryId={subcategoryId} />
    </main>
  );
}
