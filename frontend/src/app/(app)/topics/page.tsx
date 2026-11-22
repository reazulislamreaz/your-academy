import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AllTopicsDirectory } from '@/components/marketing/all-topics-directory';
import { LearnerPage } from '@/components/layout/learner-page';
import { PageHeader } from '@/components/layout/page-header';
import { DirectoryTileGridSkeleton } from '@/components/marketing/directory-tile-grid-skeleton';

export const metadata: Metadata = {
  title: 'Topic-Based Questions',
  description: 'Browse Topic Base folders and collections from your dashboard.',
};

function TopicsContent() {
  return (
    <LearnerPage dense>
      <PageHeader
        eyebrow="Practice & Learning"
        title="Topic-Based Questions"
        description="Explore Topic Base folders (Category → Sub → Child) and open uploaded collections."
      />
      <AllTopicsDirectory
        embedded
        basePath="/topics"
        setBasePath="/topics/sets"
        heading="All Topics"
        breadcrumbLabel="Topic Base"
      />
    </LearnerPage>
  );
}

/** Learner-shell Topic Base explorer — same taxonomy as `/topic-categories` (DEC-042). */
export default function TopicsPage() {
  return (
    <Suspense
      fallback={
        <LearnerPage dense>
          <PageHeader eyebrow="Practice & Learning" title="Topic-Based Questions" />
          <DirectoryTileGridSkeleton count={8} />
        </LearnerPage>
      }
    >
      <TopicsContent />
    </Suspense>
  );
}
