import type { HomepagePayload } from '@your-academy/shared';

export type HomepageSectionKind = 'categories' | 'topics';

export type CategoryTile = HomepagePayload['categories']['tiles'][number];
export type TopicTile = HomepagePayload['topics']['tiles'][number];
export type HomepageSectionTile = CategoryTile | TopicTile;

export type BannerMessage = { tone: 'success' | 'danger'; text: string } | null;
