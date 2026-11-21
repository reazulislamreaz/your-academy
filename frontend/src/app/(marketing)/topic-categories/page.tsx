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

async function loadTopicSectionCopy() {
  const defaults = createDefaultHomepagePayload().topics;
  try {
    const home = await getPublicHomepage();
    const sectionHeading =
      home.payload.topics.heading?.trim() || defaults.heading;
    const subtitle =
      home.payload.topics.subtitle?.trim() || defaults.subtitle;
    return {
      heading: 'All Topics',
      breadcrumbLabel: sectionHeading,
      subtitle,
    };
  } catch {
    return {
      heading: 'All Topics',
      breadcrumbLabel: defaults.heading,
      subtitle: defaults.subtitle,
    };
  }
}

export default async function TopicCategoriesPage() {
  const section = await loadTopicSectionCopy();

  return (
    <AllTopicsDirectory
      heading={section.heading}
      breadcrumbLabel={section.breadcrumbLabel}
      subtitle={section.subtitle}
    />
  );
}
