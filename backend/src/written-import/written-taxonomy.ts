import { nameKey } from '../categories/category-slug';

export type WrittenRootCategory = { id: string; name: string; slug: string };

export type WrittenCategoryIndex = {
  rootsByKey: Map<string, WrittenRootCategory>;
  /** `${parentId}::${nameKey}` → subcategory id */
  topicsByParentAndKey: Map<string, string>;
  /** subcategory id → canonical display name */
  topicNameById: Map<string, string>;
};

export type WrittenCategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

/** Build lookup maps for WRITTEN roots/topics (name + slug keys). */
export function buildWrittenCategoryIndex(
  categories: WrittenCategoryRow[],
): WrittenCategoryIndex {
  const rootsByKey = new Map<string, WrittenRootCategory>();
  const topicsByParentAndKey = new Map<string, string>();
  const topicNameById = new Map<string, string>();

  for (const c of categories) {
    if (!c.parentId) {
      const root = { id: c.id, name: c.name, slug: c.slug };
      rootsByKey.set(nameKey(c.name), root);
      rootsByKey.set(nameKey(c.slug), root);
      continue;
    }
    topicNameById.set(c.id, c.name);
    topicsByParentAndKey.set(`${c.parentId}::${nameKey(c.name)}`, c.id);
    topicsByParentAndKey.set(`${c.parentId}::${nameKey(c.slug)}`, c.id);
  }

  return { rootsByKey, topicsByParentAndKey, topicNameById };
}

export function resolveWrittenRoot(
  index: WrittenCategoryIndex,
  hint: string | null | undefined,
): WrittenRootCategory | null {
  const raw = hint?.trim();
  if (!raw) return null;
  return index.rootsByKey.get(nameKey(raw)) ?? null;
}

/** Resolve a subcategory under a parent by trimmed name, slug, or UUID. */
export function resolveWrittenTopicId(
  index: WrittenCategoryIndex,
  parentId: string,
  hint: string | null | undefined,
): string | undefined {
  const raw = hint?.trim();
  if (!raw) return undefined;
  if (index.topicNameById.has(raw)) {
    // UUID that exists as a WRITTEN child — still require parent scope.
    for (const [key, id] of index.topicsByParentAndKey) {
      if (id === raw && key.startsWith(`${parentId}::`)) return id;
    }
    return undefined;
  }
  return index.topicsByParentAndKey.get(`${parentId}::${nameKey(raw)}`);
}

export { nameKey };
