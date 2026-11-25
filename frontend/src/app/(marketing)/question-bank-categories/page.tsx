import type { Metadata } from 'next';
import { createDefaultHomepagePayload } from '@your-academy/shared';
import { QuestionBankCategoriesDirectory } from '@/components/marketing/question-bank-categories-directory';
import { getPublicHomepage } from '@/lib/api/homepage';

export const metadata: Metadata = {
  title: 'All Target Exam Categories',
  description:
    'Browse every target exam category in the Your Academy question bank, with logos and icons.',
};

export const revalidate = 30;

async function loadCategoryTiles() {
  try {
    const home = await getPublicHomepage();
    return {
      heading: 'All Target Exam Categories',
      subtitle:
        home.payload.categories.subtitle ||
        'Browse every exam category available in the question bank.',
      // Full catalog — homepage only previews Top 4 + Others.
      tiles: home.payload.categories.tiles,
    };
  } catch {
    const fallback = createDefaultHomepagePayload().categories;
    return {
      heading: 'All Target Exam Categories',
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
