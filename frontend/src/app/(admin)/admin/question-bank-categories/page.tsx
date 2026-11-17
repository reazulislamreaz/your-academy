'use client';

import { HomepageSectionWorkspace } from '@/features/admin/homepage-sections/homepage-section-workspace';

export default function AdminQuestionBankCategoriesPage() {
  return (
    <HomepageSectionWorkspace
      section="categories"
      eyebrow="Homepage"
      title="Question Bank Categories"
      description="Manage homepage titles: reorder positions 1–4, keep Others fixed at #5, then save draft or publish."
    />
  );
}
