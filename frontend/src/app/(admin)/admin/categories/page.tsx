'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AdminPage } from '@/components/admin/admin-page';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { CategoryTaxonomyManager } from '@/features/admin/categories/category-taxonomy-manager';
import type { CategoryScope } from '@/features/admin/categories/types';
import { cn } from '@/lib/utils';

const TABS: Array<{ id: CategoryScope; label: string; hint: string }> = [
  {
    id: 'PRELIMINARY',
    label: 'Preliminary',
    hint: 'MCQ / Preli Question Bank',
  },
  {
    id: 'WRITTEN',
    label: 'Written',
    hint: 'Written Question Bank',
  },
];

export default function AdminCategoriesPage() {
  const [scope, setScope] = useState<CategoryScope>('PRELIMINARY');

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Taxonomy"
        title="Categories"
        description="Preliminary and Written banks have separate category trees — names can overlap without colliding. Prefer Written Bank Categories in the sidebar for day-to-day Written taxonomy work."
        actions={
          <Link href="/admin/written-bank-categories">
            <Button type="button" variant="outline" className="cursor-pointer">
              Written Bank Categories
            </Button>
          </Link>
        }
      />

      <div
        role="tablist"
        aria-label="Category bank"
        className="grid gap-2 sm:grid-cols-2"
      >
        {TABS.map((tab) => {
          const active = scope === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn(
                'cursor-pointer rounded-[14px] border px-4 py-3 text-left transition-colors',
                active
                  ? 'border-[var(--highlight)] bg-[var(--highlight-soft)]'
                  : 'border-[var(--line)] bg-[var(--bg-elevated)] hover:border-[var(--highlight)]/40',
              )}
              onClick={() => setScope(tab.id)}
            >
              <p className="text-sm font-semibold text-[var(--ink)]">{tab.label}</p>
              <p className="mt-0.5 text-xs text-[var(--muted-strong)]">{tab.hint}</p>
            </button>
          );
        })}
      </div>

      <CategoryTaxonomyManager
        key={scope}
        scope={scope}
        embedded
        title={scope === 'WRITTEN' ? 'Written categories' : 'Preliminary categories'}
        description={
          scope === 'WRITTEN'
            ? 'Manage Written Question Bank categories and subcategories used by .docx / Excel uploads.'
            : 'Manage Preli / MCQ Question Bank categories and subcategories.'
        }
        eyebrow={scope === 'WRITTEN' ? 'Written bank' : 'Preliminary bank'}
      />
    </AdminPage>
  );
}
