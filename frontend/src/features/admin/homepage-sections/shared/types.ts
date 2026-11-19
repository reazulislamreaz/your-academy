import type { HomepagePayload } from '@your-academy/shared';

export type HomepageSectionKind = 'categories' | 'writtenCategories' | 'topics';

export type CategoryTile = HomepagePayload['categories']['tiles'][number];
export type WrittenCategoryTile = HomepagePayload['writtenCategories']['tiles'][number];
export type TopicTile = HomepagePayload['topics']['tiles'][number];
export type HomepageSectionTile = CategoryTile | WrittenCategoryTile | TopicTile;

export type BannerMessage = { tone: 'success' | 'danger'; text: string } | null;

/** Preli or Written category strip — same Top 4 + Others tile shape. */
export function isCategoryLikeSection(
  section: HomepageSectionKind,
): section is 'categories' | 'writtenCategories' {
  return section === 'categories' || section === 'writtenCategories';
}
