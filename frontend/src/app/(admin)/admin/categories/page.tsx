'use client';

import { CategoryTaxonomyManager } from '@/features/admin/categories/category-taxonomy-manager';

export default function AdminCategoriesPage() {
  return (
    <CategoryTaxonomyManager
      title="Categories"
      description="Organize the question bank with categories and all of their subcategories."
      eyebrow="Taxonomy"
    />
  );
}
