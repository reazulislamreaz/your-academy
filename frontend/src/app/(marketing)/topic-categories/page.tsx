import type { Metadata } from 'next';
import { createDefaultHomepagePayload } from '@your-academy/shared';
import { AllTopicsDirectory } from '@/components/marketing/all-topics-directory';
import { getPublicHomepage } from '@/lib/api/homepage';

export const metadata: Metadata = {
  title: 'All Topics — Your Academy',
  description: 'Browse every topic for question analysis on Your Academy, with logos and icons.',
};

export const revalidate = 60;

async function loadTopicSection() {
  try {
    const home = await getPublicHomepage();
    return {
      heading: 'All Topics',
      subtitle:
        home.payload.topics.subtitle ||
        'Explore every topic tile published for question analysis.',
      // Full published CMS catalog — homepage only previews Top 4 + Others.
      tiles: home.payload.topics.tiles,
    };
  } catch {
    const fallback = createDefaultHomepagePayload().topics;
    return {
      heading: 'All Topics',
      subtitle: fallback.subtitle,
      tiles: fallback.tiles,
    };
  }
}

export default async function TopicCategoriesPage() {
  const section = await loadTopicSection();

  return (
    <AllTopicsDirectory
      heading={section.heading}
      subtitle={section.subtitle}
      tiles={section.tiles}
    />
  );
}
