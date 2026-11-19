import type { HomepageIconKey, HomepagePayload } from '@your-academy/shared';
import type { CategoryNode } from '@/lib/api/types';

export const QUESTION_BANK_CATEGORIES_PATH = '/question-bank-categories';
export const ALL_TOPICS_PATH = '/topic-categories';
/** Full Written subcategory directory (homepage Others / View all). */
export const WRITTEN_SUBCATEGORIES_PATH = '/written-question-bank-categories';

/** Written bank filter by subcategory (scope enforced by the bank page + API). */
export function writtenSubcategoryHref(subcategoryId: string, categoryId?: string): string {
  const sp = new URLSearchParams();
  if (categoryId) sp.set('categoryId', categoryId);
  sp.set('subcategoryId', subcategoryId);
  return `/written-question-bank?${sp.toString()}`;
}

type CategoryTile = HomepagePayload['categories']['tiles'][number];
type WrittenCategoryTile = HomepagePayload['writtenCategories']['tiles'][number];
type TopicTile = HomepagePayload['topics']['tiles'][number];

export function categoryTileHref(tile: CategoryTile): string {
  if (tile.categoryId && tile.subcategoryId) {
    return `/preli-question-bank?categoryId=${encodeURIComponent(tile.categoryId)}&subcategoryId=${encodeURIComponent(tile.subcategoryId)}`;
  }
  if (tile.categoryId) {
    return `/preli-question-bank?categoryId=${encodeURIComponent(tile.categoryId)}`;
  }
  if (tile.subcategoryId) {
    return `/preli-question-bank?subcategoryId=${encodeURIComponent(tile.subcategoryId)}`;
  }
  return tile.fallbackHref;
}

/** Written CMS tile → Written Question Bank (never Preli). */
export function writtenCategoryTileHref(tile: WrittenCategoryTile): string {
  if (tile.categoryId && tile.subcategoryId) {
    return writtenSubcategoryHref(tile.subcategoryId, tile.categoryId);
  }
  if (tile.categoryId) {
    return `/written-question-bank?categoryId=${encodeURIComponent(tile.categoryId)}`;
  }
  if (tile.subcategoryId) {
    return writtenSubcategoryHref(tile.subcategoryId);
  }
  return tile.fallbackHref;
}

export function topicTileHref(tile: TopicTile, roots: CategoryNode[]): string {
  if (tile.categoryId && tile.subcategoryId) {
    return `/preli-question-bank?categoryId=${encodeURIComponent(tile.categoryId)}&subcategoryId=${encodeURIComponent(tile.subcategoryId)}`;
  }
  if (tile.categoryId) {
    return `/preli-question-bank?categoryId=${encodeURIComponent(tile.categoryId)}`;
  }
  if (tile.subcategoryId) {
    for (const root of roots) {
      if ((root.children ?? []).some((c) => c.id === tile.subcategoryId)) {
        return `/preli-question-bank?categoryId=${encodeURIComponent(root.id)}&subcategoryId=${encodeURIComponent(tile.subcategoryId)}`;
      }
    }
  }
  return tile.fallbackHref;
}

/** Resolve Category · Subcategory labels for a CMS topic tile (for homepage cards). */
export function topicTileTaxonomyLabel(
  tile: TopicTile,
  roots: CategoryNode[],
): string | undefined {
  let categoryName: string | undefined;
  let subcategoryName: string | undefined;

  if (tile.categoryId) {
    const root = roots.find((r) => r.id === tile.categoryId);
    categoryName = root?.name;
    if (tile.subcategoryId) {
      subcategoryName = root?.children?.find((c) => c.id === tile.subcategoryId)?.name;
    }
  } else if (tile.subcategoryId) {
    for (const root of roots) {
      const child = (root.children ?? []).find((c) => c.id === tile.subcategoryId);
      if (child) {
        categoryName = root.name;
        subcategoryName = child.name;
        break;
      }
    }
  }

  if (categoryName && subcategoryName) return `${categoryName} · ${subcategoryName}`;
  if (subcategoryName) return subcategoryName;
  if (categoryName) return categoryName;
  return undefined;
}

export function dbCategoryHref(categoryId: string): string {
  return `/preli-question-bank?categoryId=${encodeURIComponent(categoryId)}`;
}

export function dbSubcategoryHref(categoryId: string, subcategoryId: string): string {
  return `/preli-question-bank?categoryId=${encodeURIComponent(categoryId)}&subcategoryId=${encodeURIComponent(subcategoryId)}`;
}

export function dbWrittenCategoryHref(categoryId: string): string {
  return `/written-question-bank?categoryId=${encodeURIComponent(categoryId)}`;
}

export function dbWrittenSubcategoryHref(categoryId: string, subcategoryId: string): string {
  return writtenSubcategoryHref(subcategoryId, categoryId);
}

/** Best-effort icon when a DB category has no matching homepage tile logo. */
export function guessHomepageIconKey(name: string): HomepageIconKey {
  const n = name.toLowerCase();
  if (n.includes('bcs')) return 'bcs';
  if (n.includes('bank') || n.includes('ব্যাংক')) return 'bank';
  if (n.includes('ntrca') || n.includes('primary') || n.includes('প্রাথমিক')) return 'grad';
  if (
    n.includes('gov') ||
    n.includes('সরকার') ||
    n.includes('মন্ত্রণাল') ||
    n.includes('অধিদপ্ত') ||
    n.includes('রাজস্ব')
  ) {
    return 'gov';
  }
  if (n.includes('bangla') || n.includes('বাংলা')) return 'bangla';
  if (n.includes('english') || n.includes('ইংরেজি')) return 'english';
  if (n.includes('math') || n.includes('গণিত')) return 'math';
  if (n.includes('gk') || n.includes('general knowledge') || n.includes('সাধারণ')) return 'gk';
  if (n.includes('ict') || n.includes('computer')) return 'gear';
  return 'book';
}

export function matchCategoryTile(
  tiles: CategoryTile[],
  opts: {
    categoryId?: string | null;
    subcategoryId?: string | null;
    name: string;
  },
): CategoryTile | undefined {
  if (opts.subcategoryId) {
    const bySub = tiles.find((t) => t.subcategoryId === opts.subcategoryId);
    if (bySub) return bySub;
    // Legacy tiles may have pointed categoryId at the child id.
    const legacyChild = tiles.find(
      (t) => t.categoryId === opts.subcategoryId && !t.subcategoryId,
    );
    if (legacyChild) return legacyChild;
  }
  if (opts.categoryId) {
    const byRoot = tiles.find(
      (t) => t.categoryId === opts.categoryId && !t.subcategoryId,
    );
    if (byRoot) return byRoot;
  }
  const needle = opts.name.trim().toLowerCase();
  return tiles.find((t) => t.displayTitle.trim().toLowerCase() === needle);
}

export function matchTopicTile(
  tiles: TopicTile[],
  opts: {
    categoryId?: string | null;
    subcategoryId?: string | null;
    name: string;
  },
): TopicTile | undefined {
  if (opts.subcategoryId) {
    const bySub = tiles.find((t) => t.subcategoryId === opts.subcategoryId);
    if (bySub) return bySub;
  }
  if (opts.categoryId) {
    const byCat = tiles.find(
      (t) => t.categoryId === opts.categoryId && !t.subcategoryId,
    );
    if (byCat) return byCat;
  }
  const needle = opts.name.trim().toLowerCase();
  return tiles.find((t) => t.displayTitle.trim().toLowerCase() === needle);
}
