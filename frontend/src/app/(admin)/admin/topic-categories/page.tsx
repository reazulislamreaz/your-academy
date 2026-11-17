import { HomepageSectionManager } from '@/features/admin/homepage-sections/section-manager';

export default function AdminTopicCategoriesPage() {
  return (
    <HomepageSectionManager
      section="topics"
      title="Topic Based Question Analysis"
      description="Manage topic tiles, homepage Top 5, and publish when ready."
    />
  );
}
