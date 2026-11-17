import { HomepageSectionManager } from '@/features/admin/homepage-sections/section-manager';

export default function AdminTopicCategoriesPage() {
  return (
    <HomepageSectionManager
      section="topics"
      title="Topic Based Question Analysis"
      description="Add only the topics you want shown. Nothing is imported from general categories."
    />
  );
}
