import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TopicSetList } from '@/features/topic-base/topic-set-list';
import { ALL_TOPICS_PATH } from '@/lib/homepage-tile-links';

type Props = { params: Promise<{ subcategoryId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subcategoryId } = await params;
  return {
    title: 'Topic collections — Topic Base Question Analysis — Your Academy',
    description: `Browse Topic Base collections for topic ${subcategoryId}.`,
  };
}

/** Leaf folder deep-link: title-first sets only (no raw question dump). */
export default async function TopicBasePage({ params }: Props) {
  const { subcategoryId } = await params;
  return (
    <main className="marketing-container section-pad space-y-6">
      <Link
        href={ALL_TOPICS_PATH}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted-strong)] hover:text-[var(--highlight)]"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All topics
      </Link>
      <TopicSetList folderId={subcategoryId} />
    </main>
  );
}
