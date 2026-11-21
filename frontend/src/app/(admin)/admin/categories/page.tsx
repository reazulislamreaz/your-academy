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
  {
    id: 'TOPIC',
    label: 'Topics',
    hint: 'Topic Base Question Analysis',
  },
];

export default function AdminCategoriesPage() {
  const [scope, setScope] = useState<CategoryScope>('PRELIMINARY');

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Taxonomy"
        title="Categories"
        description="Preliminary, Written, and Topic Base banks each have a separate category tree. Topic icons appear on the homepage Topic Base Question Analysis section."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/topic-question-imports">
              <Button type="button" variant="outline" className="cursor-pointer">
                Topic uploads
              </Button>
            </Link>
            <Link href="/admin/written-bank-categories">
              <Button type="button" variant="outline" className="cursor-pointer">
                Written homepage Top 4
              </Button>
            </Link>
          </div>
        }
      />

      <div
        role="tablist"
        aria-label="Category bank"
        className="grid gap-2 sm:grid-cols-3"
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
        title={
          scope === 'WRITTEN'
            ? 'Written categories'
            : scope === 'TOPIC'
              ? 'Topic categories'
              : 'Preliminary categories'
        }
        description={
          scope === 'WRITTEN'
            ? 'Manage Written Question Bank categories and subcategories used by .docx / Excel uploads.'
            : scope === 'TOPIC'
              ? 'Manage Topic Base categories and subcategories (with icons) used by topic question uploads and the homepage section.'
              : 'Manage Preli / MCQ Question Bank categories and subcategories.'
        }
        eyebrow={
          scope === 'WRITTEN'
            ? 'Written bank'
            : scope === 'TOPIC'
              ? 'Topic Base'
              : 'Preliminary bank'
        }
      />
    </AdminPage>
  );
}
