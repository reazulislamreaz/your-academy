import { HomepageSectionManager } from '@/features/admin/homepage-sections/section-manager';

export default function AdminTopicCategoriesPage() {
  return (
    <HomepageSectionManager
      section="topics"
      title="Topic Based Question Analysis"
      description="Manage homepage topic tiles: logos, visibility, order, and subcategory links. Publish to update the live site."
    />
  );
}
