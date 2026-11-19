'use client';

import { HomepageSectionWorkspace } from '@/features/admin/homepage-sections/homepage-section-workspace';

export default function AdminTopicCategoriesPage() {
  return (
    <HomepageSectionWorkspace
      section="topics"
      eyebrow="Homepage"
      title="Topic Based Question Analysis"
      description="Edit the section heading and description, reorder Top 1–4 topics, keep Others fixed at #5, then save draft or publish."
    />
  );
}