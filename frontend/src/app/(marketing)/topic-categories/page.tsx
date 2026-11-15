import type { Metadata } from 'next';
import { createDefaultHomepagePayload } from '@your-academy/shared';
import { CategoryDirectory } from '@/components/marketing/category-directory';
import { getPublicHomepage } from '@/lib/api/homepage';

export const metadata: Metadata = {
  title: 'Topic Categories — Your Academy',
  description: 'Browse all topic-based question analysis categories.',
};

export const revalidate = 60;

async function loadTopics() {
  try {
    const home = await getPublicHomepage();
    return home.payload.topics;
  } catch {
    return createDefaultHomepagePayload().topics;
  }
}

export default async function TopicCategoriesPage() {
  const section = await loadTopics();

  return (
    <CategoryDirectory
      kind="topics"
      heading={section.heading}
      subtitle="Explore every topic tile published for question analysis."
      tiles={section.tiles}
      backHref="/"
      backLabel="Back to home"
    />
  );
}
