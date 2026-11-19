import type { Metadata } from 'next';
import { createDefaultHomepagePayload } from '@your-academy/shared';
import { AllTopicsDirectory } from '@/components/marketing/all-topics-directory';
import { getPublicHomepage } from '@/lib/api/homepage';

export const metadata: Metadata = {
  title: 'All Topics — Topic Base Question Analysis — Your Academy',
  description:
    'Browse every topic for question analysis on Your Academy, with logos and icons.',
};

export const revalidate = 30;

async function loadTopicSection() {
  try {
    const home = await getPublicHomepage();
    const sectionHeading =
      home.payload.topics.heading?.trim() || 'Topic Base Question Analysis';
    return {
      heading: 'All Topics',
      breadcrumbLabel: sectionHeading,
      subtitle:
        home.payload.topics.subtitle ||
        'Explore every topic available for question analysis and practice.',
      // Full published CMS catalog — homepage only previews Top 4 + Others.
      tiles: home.payload.topics.tiles,
    };
  } catch {
    const fallback = createDefaultHomepagePayload().topics;
    return {
      heading: 'All Topics',
      breadcrumbLabel: fallback.heading,
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
      breadcrumbLabel={section.breadcrumbLabel}
      subtitle={section.subtitle}
      tiles={section.tiles}
    />
  );
}
