'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import type { CategoryNode } from '@/lib/api/types';

type FilterState = {
  q?: string;
  categoryId?: string;
  subcategoryId?: string;
  difficulty?: string;
};

type Props = FilterState & {
  categories: CategoryNode[];
};

function chipHref(remove: keyof FilterState, current: FilterState) {
  const sp = new URLSearchParams();
  if (current.q && remove !== 'q') sp.set('q', current.q);
  if (current.categoryId && remove !== 'categoryId' && remove !== 'subcategoryId') {
    sp.set('categoryId', current.categoryId);
  }
  // Removing category also drops subcategory (handled above). Removing only subcategory keeps category.
  if (
    current.subcategoryId &&
    remove !== 'subcategoryId' &&
    remove !== 'categoryId' &&
    current.categoryId
  ) {
    sp.set('subcategoryId', current.subcategoryId);
  }
  if (current.difficulty && remove !== 'difficulty') sp.set('difficulty', current.difficulty);
  const qs = sp.toString();
  return qs ? `/questions?${qs}` : '/questions';
}

export function FilterChips({
  categories,
  q,
  categoryId,
  subcategoryId,
  difficulty,
}: Props) {
  const current: FilterState = { q, categoryId, subcategoryId, difficulty };
  const category = categories.find((c) => c.id === categoryId);
  const subcategory = category?.children.find((c) => c.id === subcategoryId);
  const chips: Array<{ key: string; label: string; href: string }> = [];

  if (q) {
    chips.push({ key: 'q', label: `Search: ${q}`, href: chipHref('q', current) });
  }
  if (category) {
    chips.push({
      key: 'categoryId',
      label: category.name,
      href: chipHref('categoryId', current),
    });
  }
  if (subcategory) {
    chips.push({
      key: 'subcategoryId',
      label: subcategory.name,
      href: chipHref('subcategoryId', current),
    });
  }
  if (difficulty) {
    chips.push({
      key: 'difficulty',
      label: difficulty.charAt(0) + difficulty.slice(1).toLowerCase(),
      href: chipHref('difficulty', current),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex max-w-full flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          className="inline-flex max-w-full items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-semibold text-[var(--ink-soft)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--bg-muted)]"
        >
          <span className="min-w-0 truncate">{chip.label}</span>
          <X className="h-3 w-3 shrink-0 text-[var(--muted)]" aria-hidden />
          <span className="sr-only">Remove filter</span>
        </Link>
      ))}
      <Link
        href="/questions"
        className="inline-block py-2 text-xs font-semibold text-[var(--muted)] underline-offset-2 hover:text-[var(--highlight)] hover:underline"
      >
        Clear all
      </Link>
    </div>
  );
}
