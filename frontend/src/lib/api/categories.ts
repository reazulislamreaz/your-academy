import { apiFetch } from '@/lib/api/client';
import type { CategoryNode, CategoryScope } from '@/lib/api/types';

/** Stable React Query key for public category trees (never mix scopes). */
export function publicCategoriesQueryKey(scope: CategoryScope) {
  return ['categories', 'public', scope] as const;
}

/** Active category tree for one bank only. */
export function fetchPublicCategories(scope: CategoryScope): Promise<CategoryNode[]> {
  return apiFetch<CategoryNode[]>(`/categories?scope=${encodeURIComponent(scope)}`, {
    skipRefresh: true,
  });
}

export function flattenSubcategories(roots: CategoryNode[]) {
  const items: Array<{ id: string; name: string; label: string; parentId: string }> = [];
  for (const root of roots) {
    for (const child of root.children ?? []) {
      items.push({
        id: child.id,
        name: child.name,
        label: `${root.name} · ${child.name}`,
        parentId: root.id,
      });
    }
  }
  return items.sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
  );
}
