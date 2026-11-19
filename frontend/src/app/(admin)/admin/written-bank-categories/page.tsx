'use client';

import Link from 'next/link';
import { CategoryTaxonomyManager } from '@/features/admin/categories/category-taxonomy-manager';
import { Button } from '@/components/ui/button';

/**
 * Dedicated Written taxonomy CRUD — same UI/workflow as Preliminary categories,
 * bound strictly to CategoryScope.WRITTEN (DEC-041).
 */
export default function AdminWrittenBankCategoriesPage() {
  return (
    <CategoryTaxonomyManager
      scope="WRITTEN"
      eyebrow="Written bank"
      title="Written Bank Categories"
      description="Create and manage Written Question Bank categories and nested subcategories. These power Written uploads, the public Written bank filters, and the homepage Written exam categories strip — never mixed with Preliminary."
      headerExtra={
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/written-question-imports">
            <Button type="button" variant="outline" className="cursor-pointer">
              Written uploads
            </Button>
          </Link>
          <Link href="/admin/categories">
            <Button type="button" variant="ghost" className="cursor-pointer">
              All taxonomy
            </Button>
          </Link>
        </div>
      }
    />
  );
}
