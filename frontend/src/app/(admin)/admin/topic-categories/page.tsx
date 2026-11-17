'use client';

import { HomepageSectionWorkspace } from '@/features/admin/homepage-sections/homepage-section-workspace';

export default function AdminTopicCategoriesPage() {
  return (
    <HomepageSectionWorkspace
      section="topics"
      eyebrow="Homepage"
      title="Topic Based Question Analysis"
      description="Manage homepage topics: reorder positions 1–4, keep Others fixed at #5, then save draft or publish."
    />
  );
}