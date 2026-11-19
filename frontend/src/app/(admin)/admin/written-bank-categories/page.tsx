'use client';

import { HomepageSectionWorkspace } from '@/features/admin/homepage-sections/homepage-section-workspace';

/**
 * Written homepage Top 4 + locked #5 Others — mirrors Question Bank Categories,
 * scoped strictly to WRITTEN taxonomy (DEC-041).
 */
export default function AdminWrittenBankCategoriesPage() {
  return (
    <HomepageSectionWorkspace
      section="writtenCategories"
      eyebrow="Homepage"
      title="Written Bank Categories"
      description="Manage homepage Written titles: reorder positions 1–4, keep Others fixed at #5, then save draft or publish. Library lists Written categories only — never Preliminary."
    />
  );
}
