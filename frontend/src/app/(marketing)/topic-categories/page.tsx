import type { Metadata } from 'next';
import { Suspense } from 'react';
import { createDefaultHomepagePayload } from '@your-academy/shared';
import { AllTopicsDirectory } from '@/components/marketing/all-topics-directory';
import { DirectoryTileGridSkeleton } from '@/components/marketing/directory-tile-grid-skeleton';
import { getPublicHomepage } from '@/lib/api/homepage';

export const metadata: Metadata = {
  title: 'All Topics — Topic Base Question Analysis',
  description:
    'Browse Topic Base folders (Category → Sub Category → Child Category) and open question collections.',
};

export const revalidate = 30;

async function loadTopicSectionCopy() {
  const defaults = createDefaultHomepagePayload().topics;
  try {
    const home = await getPublicHomepage();
    const sectionHeading =
      home.payload.topics.heading?.trim() || defaults.heading;
    return {
      heading: 'All Topics',
      breadcrumbLabel: sectionHeading,
    };
  } catch {
    return {
      heading: 'All Topics',
      breadcrumbLabel: defaults.heading,
    };
  }
}

export default async function TopicCategoriesPage() {
  const section = await loadTopicSectionCopy();

  return (
    <Suspense
      fallback={
        <div className="marketing-container section-pad">
          <DirectoryTileGridSkeleton count={8} />
        </div>
      }
    >
      <AllTopicsDirectory
        heading={section.heading}
        breadcrumbLabel={section.breadcrumbLabel}
      />
    </Suspense>
  );
}
