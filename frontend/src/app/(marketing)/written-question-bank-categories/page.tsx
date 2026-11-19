import type { Metadata } from 'next';
import { WrittenSubcategoriesDirectory } from '@/components/marketing/written-subcategories-directory';

export const metadata: Metadata = {
  title: 'All Written Subcategories — Your Academy',
  description:
    'Browse every Written Question Bank subcategory and open filtered collections on Your Academy.',
};

export const revalidate = 30;

export default function WrittenQuestionBankCategoriesPage() {
  return (
    <WrittenSubcategoriesDirectory
      heading="All Written Subcategories"
      breadcrumbLabel="Written exam categories"
      subtitle="Explore every Written exam subcategory — tap a card to open the Written Question Bank filtered to that topic."
    />
  );
}
