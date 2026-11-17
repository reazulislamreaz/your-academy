import type { Metadata } from 'next';
import type { HomepagePayload } from '@your-academy/shared';
import { AllTopicsDirectory } from '@/components/marketing/all-topics-directory';
import { getPublicHomepage } from '@/lib/api/homepage';

export const metadata: Metadata = {
  title: 'All Topics — Your Academy',
  description: 'Browse all topic-based question analysis categories with logos.',
};

export const revalidate = 60;

async function loadTopics(): Promise<HomepagePayload['topics']['tiles']> {
  try {
    const home = await getPublicHomepage();
    // Published CMS tiles only — never invent topics from taxonomy or defaults on failure.
    return home.payload.topics.tiles;
  } catch {
    return [];
  }
}

export default async function TopicCategoriesPage() {
  const tiles = await loadTopics();

  return (
    <AllTopicsDirectory
      heading="All Topics"
      subtitle="Explore every topic tile published for question analysis."
      tiles={tiles}
    />
  );
}
