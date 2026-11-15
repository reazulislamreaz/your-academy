import type { Metadata } from 'next';
import { createDefaultHomepagePayload } from '@your-academy/shared';
import { CategoryDirectory } from '@/components/marketing/category-directory';
import { getPublicHomepage } from '@/lib/api/homepage';

export const metadata: Metadata = {
  title: 'Question Bank Categories — Your Academy',
  description: 'Browse all exam categories in the Your Academy question bank.',
};

export const revalidate = 60;

async function loadCategories() {
  try {
    const home = await getPublicHomepage();
    return home.payload.categories;
  } catch {
    return createDefaultHomepagePayload().categories;
  }
}

export default async function QuestionBankCategoriesPage() {
  const section = await loadCategories();

  return (
    <CategoryDirectory
      kind="categories"
      heading={section.heading}
      subtitle={section.subtitle}
      tiles={section.tiles}
      backHref="/"
      backLabel="Back to home"
    />
  );
}
