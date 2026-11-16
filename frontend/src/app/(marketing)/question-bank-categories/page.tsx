import type { Metadata } from 'next';
import { createDefaultHomepagePayload } from '@your-academy/shared';
import { QuestionBankCategoriesDirectory } from '@/components/marketing/question-bank-categories-directory';
import { getPublicHomepage } from '@/lib/api/homepage';

export const metadata: Metadata = {
  title: 'All Question Bank Categories — Your Academy',
  description:
    'Browse every exam category and subcategory in the Your Academy question bank.',
};

export const revalidate = 60;

async function loadCategoryTiles() {
  try {
    const home = await getPublicHomepage();
    return {
      heading: 'All Question Bank Categories',
      subtitle:
        home.payload.categories.subtitle ||
        'Explore every category and subcategory available in the question bank.',
      tiles: home.payload.categories.tiles,
    };
  } catch {
    const fallback = createDefaultHomepagePayload().categories;
    return {
      heading: 'All Question Bank Categories',
      subtitle: fallback.subtitle,
      tiles: fallback.tiles,
    };
  }
}

export default async function QuestionBankCategoriesPage() {
  const section = await loadCategoryTiles();

  return (
    <QuestionBankCategoriesDirectory
      heading={section.heading}
      subtitle={section.subtitle}
      tiles={section.tiles}
    />
  );
}
