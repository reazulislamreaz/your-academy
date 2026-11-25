import type { Metadata } from 'next';
import { WrittenSubcategoriesDirectory } from '@/components/marketing/written-subcategories-directory';
import { getPageHeader, pageHeaderMetadata } from '@/lib/site-content';

/** DEC-069 — header + SEO from Admin → Page Headers (defaults = previous text). */
export async function generateMetadata(): Promise<Metadata> {
  return pageHeaderMetadata(
    await getPageHeader('writtenCategories'),
    '/written-question-bank-categories',
  );
}

export const revalidate = 30;

export default async function WrittenQuestionBankCategoriesPage() {
  const header = await getPageHeader('writtenCategories');
  return (
    <WrittenSubcategoriesDirectory
      heading={header.heading}
      breadcrumbLabel="Written exam categories"
      subtitle={header.description}
    />
  );
}
