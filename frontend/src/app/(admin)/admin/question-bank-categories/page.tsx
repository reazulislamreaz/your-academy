'use client';

import { useState } from 'react';
import { AdminPage } from '@/components/admin/admin-page';
import { PageHeader } from '@/components/layout/page-header';
import { CategoryTaxonomyManager } from '@/features/admin/categories/category-taxonomy-manager';
import { HomepageSectionManager } from '@/features/admin/homepage-sections/section-manager';
import { cn } from '@/lib/utils';

type TabId = 'taxonomy' | 'homepage';

const TABS: { id: TabId; label: string }[] = [
  { id: 'taxonomy', label: 'All categories' },
  { id: 'homepage', label: 'Homepage tiles' },
];

export default function AdminQuestionBankCategoriesPage() {
  const [tab, setTab] = useState<TabId>('taxonomy');

  return (
    <AdminPage dense>
      <PageHeader
        eyebrow="Question bank"
        title="Question Bank Categories"
        description="View every category and subcategory, then curate homepage tiles separately."
      />

      <div
        role="tablist"
        aria-label="Question bank categories views"
        className="flex gap-1 overflow-x-auto rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-muted)] p-1"
      >
        {TABS.map((item) => {
          const selected = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={cn(
                'min-h-10 min-w-[7rem] flex-1 cursor-pointer rounded-[calc(var(--radius)-2px)] px-3 text-center text-sm font-semibold whitespace-nowrap transition-colors',
                selected
                  ? 'bg-[var(--bg-elevated)] text-[var(--ink)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]',
              )}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="pt-1">
        {tab === 'taxonomy' ? (
          <CategoryTaxonomyManager
            embedded
            title="Question Bank Categories"
            description="Every category and all of its subcategories from the database."
          />
        ) : (
          <HomepageSectionManager
            embedded
            section="categories"
            title="Homepage category tiles"
            description="Curate which category tiles appear on the homepage Top 5. Database categories are not limited by this list."
          />
        )}
      </div>
    </AdminPage>
  );
}
