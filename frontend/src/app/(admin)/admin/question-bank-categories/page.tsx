import { HomepageSectionManager } from '@/features/admin/homepage-sections/section-manager';

export default function AdminQuestionBankCategoriesPage() {
  return (
    <HomepageSectionManager
      section="categories"
      title="Question Bank Categories"
      description="Manage category tiles, homepage Top 5, and publish when ready."
    />
  );
}
