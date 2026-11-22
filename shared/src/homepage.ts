import { z } from 'zod';
import {
  createDefaultExtendedSections,
  createDefaultHomepageLayout,
  homepageExtendedSectionsSchema,
  homepageLayoutSchema,
  normalizeHomepageLayout,
  type HomepageBuiltinSectionId,
} from './homepage-layout';

export {
  HOMEPAGE_BUILTIN_SECTION_IDS,
  HOMEPAGE_SECTION_LABELS,
  createDefaultExtendedSections,
  createDefaultHomepageLayout,
  customSectionIdFromLayoutId,
  isCustomLayoutSectionId,
  normalizeHomepageLayout,
  toCustomLayoutId,
  type HomepageBuiltinSectionId,
  type HomepageExtendedSections,
  type HomepageLayout,
} from './homepage-layout';

/** Whitelisted icon keys for homepage tiles / stats (maps to local components). */
export const HOMEPAGE_ICON_KEYS = [
  'graduation',
  'users',
  'book',
  'trophy',
  'bcs',
  'bank',
  'gov',
  'grad',
  'gear',
  'bangla',
  'english',
  'math',
  'gk',
  'check',
  'xcircle',
  'percent',
  'trending',
  'barchart',
] as const;

export type HomepageIconKey = (typeof HOMEPAGE_ICON_KEYS)[number];

const hrefSchema = z.string().min(1).max(500);
const shortText = z.string().max(200);
const mediumText = z.string().max(500);
const longText = z.string().max(4000);

const ctaSchema = z.object({
  label: shortText,
  href: hrefSchema,
  visible: z.boolean().default(true),
});

const heroStatSchema = z.object({
  iconKey: z.enum(HOMEPAGE_ICON_KEYS),
  value: shortText,
  label: shortText,
});

const categoryTileSchema = z.object({
  id: z.string().min(1).max(64),
  displayTitle: shortText,
  subtitle: shortText.optional().default(''),
  iconKey: z.enum(HOMEPAGE_ICON_KEYS),
  /** Optional Cloudinary MediaAsset id for a custom tile logo. */
  logoAssetId: z.string().uuid().nullable().optional(),
  /** Resolved delivery URL — filled by API on read; stripped on write. */
  logoUrl: z.string().max(2000).nullable().optional(),
  /** Optional display dimensions of the stored logo (informational). */
  logoWidth: z.number().int().positive().nullable().optional(),
  logoHeight: z.number().int().positive().nullable().optional(),
  /** Linked root category (optional navigation target). */
  categoryId: z.string().uuid().nullable().optional(),
  /**
   * Linked subcategory — allows promoting any DB subcategory into the
   * homepage Top 5 without duplicating Category rows (DEC-038).
   */
  subcategoryId: z.string().uuid().nullable().optional(),
  fallbackHref: hrefSchema,
  visible: z.boolean().default(true),
});

const topicTileSchema = z.object({
  id: z.string().min(1).max(64),
  displayTitle: shortText,
  iconKey: z.enum(HOMEPAGE_ICON_KEYS),
  logoAssetId: z.string().uuid().nullable().optional(),
  logoUrl: z.string().max(2000).nullable().optional(),
  logoWidth: z.number().int().positive().nullable().optional(),
  logoHeight: z.number().int().positive().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  subcategoryId: z.string().uuid().nullable().optional(),
  fallbackHref: hrefSchema,
  visible: z.boolean().default(true),
});

/**
 * Total homepage preview slots including the fixed Others tile at position 5.
 * Positions 1–4 are admin-managed; position 5 is always Others (DEC-038).
 */
export const HOMEPAGE_SECTION_PREVIEW_LIMIT = 5;

/** How many admin-managed tiles appear before the fixed Others slot. */
export const HOMEPAGE_EDITABLE_PREVIEW_SLOTS = HOMEPAGE_SECTION_PREVIEW_LIMIT - 1;

/** Stable CMS id for the fixed Others tile (categories + topics sections). */
export const HOMEPAGE_OTHERS_TILE_ID = 'others';

/** Default display title for the fixed Others tile. */
export const HOMEPAGE_OTHERS_DISPLAY_TITLE = 'Others';

/** Recommended square logo size for homepage category/topic tiles (px). */
export const HOMEPAGE_TILE_LOGO_SIZE = 256;

type HomepageTileLike = {
  id: string;
  displayTitle: string;
  visible: boolean;
};

/**
 * True when the tile is the reserved Others slot.
 * Linked taxonomy tiles (categoryId/subcategoryId) named "Others" are never treated as reserved.
 */
export function isHomepageOthersTile(
  tile: Pick<HomepageTileLike, 'id' | 'displayTitle'> & {
    categoryId?: string | null;
    subcategoryId?: string | null;
  },
): boolean {
  if (tile.id === HOMEPAGE_OTHERS_TILE_ID) return true;
  if (tile.categoryId || tile.subcategoryId) return false;
  return tile.displayTitle.trim().toLowerCase() === HOMEPAGE_OTHERS_DISPLAY_TITLE.toLowerCase();
}

export function createDefaultOthersCategoryTile(
  fallbackHref = '/question-bank-categories',
): z.infer<typeof categoryTileSchema> {
  return {
    id: HOMEPAGE_OTHERS_TILE_ID,
    displayTitle: HOMEPAGE_OTHERS_DISPLAY_TITLE,
    subtitle: '',
    iconKey: 'gear',
    categoryId: null,
    subcategoryId: null,
    fallbackHref,
    visible: true,
    logoAssetId: null,
    logoUrl: null,
  };
}

export function createDefaultOthersTopicTile(
  fallbackHref = '/topic-categories',
): z.infer<typeof topicTileSchema> {
  return {
    id: HOMEPAGE_OTHERS_TILE_ID,
    displayTitle: HOMEPAGE_OTHERS_DISPLAY_TITLE,
    iconKey: 'gear',
    categoryId: null,
    subcategoryId: null,
    fallbackHref,
    visible: true,
    logoAssetId: null,
    logoUrl: null,
  };
}

/**
 * Enforce: exactly one Others tile, always visible, always immediately after
 * the Top 4 group (UI position #5). Regular tiles *before* Others are Top 1–4
 * (0–4 items — demoted slots stay empty). Regular tiles *after* Others are the
 * remaining library. Does not backfill Top 4 from the remaining list.
 * Deduplicates Others and strips accidental duplicate ids among regular tiles.
 */
export function normalizeHomepageSectionTiles<T extends HomepageTileLike>(
  tiles: T[],
  createOthers: () => T,
): T[] {
  const othersSources: T[] = [];
  const beforeOthers: T[] = [];
  const afterOthers: T[] = [];
  const seenRegularIds = new Set<string>();
  let sawOthers = false;

  for (const tile of tiles) {
    if (isHomepageOthersTile(tile)) {
      othersSources.push(tile);
      sawOthers = true;
      continue;
    }
    if (seenRegularIds.has(tile.id)) continue;
    seenRegularIds.add(tile.id);
    if (sawOthers) afterOthers.push(tile);
    else beforeOthers.push(tile);
  }

  const source = othersSources[0];
  const defaults = createOthers();
  const others: T = {
    ...defaults,
    ...source,
    id: HOMEPAGE_OTHERS_TILE_ID,
    visible: true,
    // Preserve admin-edited title when present; otherwise keep default label.
    displayTitle:
      source?.displayTitle?.trim() ||
      defaults.displayTitle ||
      HOMEPAGE_OTHERS_DISPLAY_TITLE,
  };

  // No Others marker in input: first 4 regulars become Top, remainder become rest.
  // When Others is present: tiles before it are Top (0–4, not backfilled from rest);
  // tiles after it stay in the remaining list — including a fully demoted Top 4.
  if (!sawOthers) {
    const ordered = beforeOthers;
    const top = ordered.slice(0, HOMEPAGE_EDITABLE_PREVIEW_SLOTS);
    const rest = ordered.slice(HOMEPAGE_EDITABLE_PREVIEW_SLOTS);
    return [...top, others, ...rest];
  }

  const top = beforeOthers.slice(0, HOMEPAGE_EDITABLE_PREVIEW_SLOTS);
  const overflowFromTop = beforeOthers.slice(HOMEPAGE_EDITABLE_PREVIEW_SLOTS);
  const rest = [...overflowFromTop, ...afterOthers];
  return [...top, others, ...rest];
}

/** Split normalized tiles into top (≤4), fixed Others, and remaining. */
export function splitHomepageSectionTiles<T extends HomepageTileLike>(tiles: T[]): {
  top: T[];
  others: T | null;
  rest: T[];
} {
  const othersIndex = tiles.findIndex((t) => isHomepageOthersTile(t));
  if (othersIndex < 0) {
    return {
      top: tiles.slice(0, HOMEPAGE_EDITABLE_PREVIEW_SLOTS),
      others: null,
      rest: tiles.slice(HOMEPAGE_EDITABLE_PREVIEW_SLOTS),
    };
  }
  const others = tiles[othersIndex]!;
  const top = tiles.slice(0, othersIndex).slice(0, HOMEPAGE_EDITABLE_PREVIEW_SLOTS);
  const rest = tiles.slice(othersIndex + 1);
  return { top, others, rest };
}

/**
 * Promote a regular tile into the Top 4 (never displaces Others).
 * @param insertAt 0-based Top slot (0 = position 1). Defaults to first empty
 *   slot, or position 1 when Top 4 is already full (shifts others down; old #4
 *   moves to the remaining list).
 */
export function promoteTileIntoHomepageTop<T extends HomepageTileLike>(
  tiles: T[],
  tileId: string,
  createOthers: () => T,
  insertAt?: number,
): T[] {
  const normalized = normalizeHomepageSectionTiles(tiles, createOthers);
  const { top, others, rest } = splitHomepageSectionTiles(normalized);
  if (!others || tileId === HOMEPAGE_OTHERS_TILE_ID) {
    return normalized;
  }

  const fromTop = top.findIndex((t) => t.id === tileId);
  const fromRest = rest.findIndex((t) => t.id === tileId);
  if (fromTop < 0 && fromRest < 0) return normalized;

  const item =
    fromTop >= 0 ? { ...top[fromTop]!, visible: true } : { ...rest[fromRest]!, visible: true };

  let nextTop = top.filter((t) => t.id !== tileId);
  let nextRest = rest.filter((t) => t.id !== tileId);

  // Fill empty slots from the end; when full, default to position 1 (shift down).
  const defaultIndex =
    nextTop.length < HOMEPAGE_EDITABLE_PREVIEW_SLOTS ? nextTop.length : 0;
  const maxIndex =
    nextTop.length >= HOMEPAGE_EDITABLE_PREVIEW_SLOTS
      ? HOMEPAGE_EDITABLE_PREVIEW_SLOTS - 1
      : nextTop.length;
  const insertIndex = Math.max(
    0,
    Math.min(insertAt === undefined ? defaultIndex : insertAt, maxIndex),
  );

  nextTop.splice(insertIndex, 0, item);
  if (nextTop.length > HOMEPAGE_EDITABLE_PREVIEW_SLOTS) {
    const overflow = nextTop.slice(HOMEPAGE_EDITABLE_PREVIEW_SLOTS);
    nextTop = nextTop.slice(0, HOMEPAGE_EDITABLE_PREVIEW_SLOTS);
    nextRest = [...overflow, ...nextRest];
  }

  return normalizeHomepageSectionTiles([...nextTop, others, ...nextRest], createOthers);
}

/** Remove a regular tile from Top 4 into the remaining list (Others stays #5). */
export function demoteTileFromHomepageTop<T extends HomepageTileLike>(
  tiles: T[],
  tileId: string,
  createOthers: () => T,
): T[] {
  const normalized = normalizeHomepageSectionTiles(tiles, createOthers);
  const { top, others, rest } = splitHomepageSectionTiles(normalized);
  if (!others || tileId === HOMEPAGE_OTHERS_TILE_ID) {
    return normalized;
  }
  const idx = top.findIndex((t) => t.id === tileId);
  if (idx < 0) return normalized;
  const nextTop = [...top];
  const [item] = nextTop.splice(idx, 1);
  return normalizeHomepageSectionTiles(
    [...nextTop, others, item!, ...rest],
    createOthers,
  );
}

/** Reorder only within the Top 4 slots (Others stays fixed at #5). */
export function reorderHomepageTopTiles<T extends HomepageTileLike>(
  tiles: T[],
  fromTopIndex: number,
  toTopIndex: number,
  createOthers: () => T,
): T[] {
  const normalized = normalizeHomepageSectionTiles(tiles, createOthers);
  const { top, others, rest } = splitHomepageSectionTiles(normalized);
  if (!others) return normalized;
  if (
    fromTopIndex < 0 ||
    toTopIndex < 0 ||
    fromTopIndex >= top.length ||
    toTopIndex >= top.length ||
    fromTopIndex === toTopIndex
  ) {
    return normalized;
  }
  const nextTop = [...top];
  const [item] = nextTop.splice(fromTopIndex, 1);
  nextTop.splice(toTopIndex, 0, item!);
  return normalizeHomepageSectionTiles(
    [...nextTop, others, ...rest],
    createOthers,
  );
}

/**
 * Move a Top-4 tile to an absolute 1-based position (1–4).
 * No-op for Others or out-of-range positions.
 */
export function moveHomepageTopTileToPosition<T extends HomepageTileLike>(
  tiles: T[],
  tileId: string,
  position1Based: number,
  createOthers: () => T,
): T[] {
  const normalized = normalizeHomepageSectionTiles(tiles, createOthers);
  const { top } = splitHomepageSectionTiles(normalized);
  const from = top.findIndex((t) => t.id === tileId);
  if (from < 0) return normalized;
  const to = Math.max(0, Math.min(position1Based - 1, top.length - 1));
  return reorderHomepageTopTiles(tiles, from, to, createOthers);
}

/** Apply Others normalization to Preli categories, Written categories, and topics. */
export function normalizeHomepagePayloadTiles(payload: HomepagePayload): HomepagePayload {
  return {
    ...payload,
    categories: {
      ...payload.categories,
      tiles: normalizeHomepageSectionTiles(
        payload.categories.tiles,
        () => createDefaultOthersCategoryTile(payload.categories.cta.href || '/question-bank-categories'),
      ),
    },
    writtenCategories: {
      ...payload.writtenCategories,
      tiles: normalizeHomepageSectionTiles(
        payload.writtenCategories.tiles,
        () =>
          createDefaultOthersCategoryTile(
            payload.writtenCategories.cta.href || '/written-question-bank-categories',
          ),
      ),
    },
    topics: {
      ...payload.topics,
      tiles: normalizeHomepageSectionTiles(
        payload.topics.tiles,
        () => createDefaultOthersTopicTile(payload.topics.cta.href || '/topic-categories'),
      ),
    },
  };
}

const progressMetricSchema = z.object({
  value: shortText,
  label: shortText,
  iconKey: z.enum(HOMEPAGE_ICON_KEYS),
  tone: z.enum(['info', 'success', 'danger', 'insight']).default('info'),
});

const coreHomepagePayloadSchema = z.object({
  layout: homepageLayoutSchema.default(createDefaultHomepageLayout()),
  hero: z.object({
    visible: z.boolean().default(true),
    eyebrow: mediumText,
    titleBefore: mediumText,
    titleHighlight: shortText,
    titleAfter: mediumText.optional().default(''),
    description: longText,
    primaryCta: ctaSchema,
    secondaryCta: ctaSchema,
    stats: z.array(heroStatSchema).max(6).default([]),
    backgroundToken: z.enum(['inverse', 'desk', 'elevated']).default('inverse'),
  }),
  categories: z.object({
    visible: z.boolean().default(true),
    eyebrow: shortText.optional().default('Preliminary'),
    heading: mediumText,
    subtitle: mediumText,
    cta: ctaSchema,
    tiles: z.array(categoryTileSchema).max(200).default([]),
  }),
  /**
   * Written Question Bank homepage strip — isolated from Preliminary `categories`
   * (same Top 1–4 + locked #5 Others shape). Default fills legacy payloads that
   * predate this section so draft/publish parse keeps working.
   */
  writtenCategories: z
    .object({
      visible: z.boolean().default(true),
      eyebrow: shortText.optional().default('Written'),
      heading: mediumText,
      subtitle: mediumText,
      cta: ctaSchema,
      tiles: z.array(categoryTileSchema).max(200).default([]),
    })
    .default({
      visible: true,
      eyebrow: 'Written',
      heading: 'Written exam categories',
      subtitle: 'Browse the Written bank by the exams you are preparing for',
      cta: {
        label: 'View all categories',
        href: '/written-question-bank-categories',
        visible: true,
      },
      tiles: [
        {
          id: 'wrt-bcs',
          displayTitle: 'BCS Written',
          subtitle: 'Written Exams',
          iconKey: 'bcs',
          categoryId: null,
          subcategoryId: null,
          fallbackHref: '/written-question-bank?q=BCS',
          visible: true,
        },
        {
          id: 'wrt-bank',
          displayTitle: 'Bank Written',
          subtitle: 'Written Exams',
          iconKey: 'bank',
          categoryId: null,
          subcategoryId: null,
          fallbackHref: '/written-question-bank?q=Bank',
          visible: true,
        },
        {
          id: 'wrt-gov',
          displayTitle: 'Government Jobs',
          subtitle: 'Written Exams',
          iconKey: 'gov',
          categoryId: null,
          subcategoryId: null,
          fallbackHref: '/written-question-bank?q=Government',
          visible: true,
        },
        {
          id: 'wrt-ntrca',
          displayTitle: 'Primary & NTRCA',
          subtitle: 'Written Exams',
          iconKey: 'grad',
          categoryId: null,
          subcategoryId: null,
          fallbackHref: '/written-question-bank?q=NTRCA',
          visible: true,
        },
        {
          id: HOMEPAGE_OTHERS_TILE_ID,
          displayTitle: HOMEPAGE_OTHERS_DISPLAY_TITLE,
          subtitle: '',
          iconKey: 'gear',
          categoryId: null,
          subcategoryId: null,
          fallbackHref: '/written-question-bank-categories',
          visible: true,
        },
      ],
    }),
  topics: z.object({
    visible: z.boolean().default(true),
    eyebrow: shortText.optional().default('Topic analysis'),
    heading: mediumText,
    /**
     * Legacy short tagline (no longer rendered). Kept for older drafts;
     * editors write the public lede into `subtitle`.
     */
    subheading: mediumText.default(''),
    /** Paragraph under the heading — same role as categories/writtenCategories.subtitle. */
    subtitle: mediumText.default(''),
    cta: ctaSchema,
    tiles: z.array(topicTileSchema).max(200).default([]),
  }),
  why: z.object({
    visible: z.boolean().default(true),
    eyebrow: shortText.optional().default('Why us'),
    heading: mediumText,
    points: z.array(mediumText).max(20).default([]),
  }),
  progress: z.object({
    visible: z.boolean().default(true),
    heading: mediumText,
    metrics: z.array(progressMetricSchema).max(8).default([]),
    trendCaption: mediumText,
  }),
  ctaBanner: z.object({
    visible: z.boolean().default(true),
    heading: mediumText,
    body: longText,
    cta: ctaSchema,
  }),
  latest: z.object({
    visible: z.boolean().default(true),
    eyebrow: shortText.optional().default('Uploads'),
    heading: mediumText,
    subtitle: mediumText,
    cta: ctaSchema,
    limit: z.number().int().min(1).max(20).default(6),
  }),
  newsletter: z.object({
    visible: z.boolean().default(true),
    title: mediumText,
    body: longText,
    cta: ctaSchema,
  }),
});

export const homepagePayloadSchema = coreHomepagePayloadSchema.merge(
  homepageExtendedSectionsSchema,
);

export type HomepagePayload = z.infer<typeof homepagePayloadSchema>;

/** Full normalize: Others tiles + layout order + section visibility sync. */
export function normalizeHomepagePayload(payload: HomepagePayload): HomepagePayload {
  const withTiles = normalizeHomepagePayloadTiles(payload);
  const visibilityHints: Partial<Record<HomepageBuiltinSectionId, boolean>> = {
    hero: withTiles.hero.visible,
    categories: withTiles.categories.visible,
    writtenCategories: withTiles.writtenCategories.visible,
    topics: withTiles.topics.visible,
    why: withTiles.why.visible,
    ctaBanner: withTiles.ctaBanner.visible,
    latest: withTiles.latest.visible,
    newsletter: withTiles.newsletter.visible,
    trialStrip: withTiles.trialStrip.visible,
    liveStats: withTiles.liveStats.visible,
    sampleMcq: withTiles.sampleMcq.visible,
    productFeatures: withTiles.productFeatures.visible,
    howItWorks: withTiles.howItWorks.visible,
    dashboardPreview: withTiles.dashboardPreview.visible,
    newsStrip: withTiles.newsStrip.visible,
    accessFaq: withTiles.accessFaq.visible,
  };
  const layout = normalizeHomepageLayout(withTiles.layout, visibilityHints);

  // Mirror layout visibility back onto section objects for editors that bind to `.visible`.
  const vis = (id: HomepageBuiltinSectionId) =>
    layout.sections.find((s) => s.id === id)?.visible ?? true;

  return {
    ...withTiles,
    layout,
    hero: { ...withTiles.hero, visible: vis('hero') },
    categories: { ...withTiles.categories, visible: vis('categories') },
    writtenCategories: {
      ...withTiles.writtenCategories,
      visible: vis('writtenCategories'),
    },
    topics: { ...withTiles.topics, visible: vis('topics') },
    why: { ...withTiles.why, visible: vis('why') },
    ctaBanner: { ...withTiles.ctaBanner, visible: vis('ctaBanner') },
    latest: { ...withTiles.latest, visible: vis('latest') },
    newsletter: { ...withTiles.newsletter, visible: vis('newsletter') },
    trialStrip: { ...withTiles.trialStrip, visible: vis('trialStrip') },
    liveStats: { ...withTiles.liveStats, visible: vis('liveStats') },
    sampleMcq: { ...withTiles.sampleMcq, visible: vis('sampleMcq') },
    productFeatures: { ...withTiles.productFeatures, visible: vis('productFeatures') },
    howItWorks: { ...withTiles.howItWorks, visible: vis('howItWorks') },
    dashboardPreview: { ...withTiles.dashboardPreview, visible: vis('dashboardPreview') },
    newsStrip: { ...withTiles.newsStrip, visible: vis('newsStrip') },
    accessFaq: { ...withTiles.accessFaq, visible: vis('accessFaq') },
  };
}

/** Default payload mirrors the marketing homepage (honest copy; live stats override hero.stats). */
export function createDefaultHomepagePayload(): HomepagePayload {
  const extended = createDefaultExtendedSections();
  return homepagePayloadSchema.parse({
    layout: createDefaultHomepageLayout(),
    ...extended,
    hero: {
      visible: true,
      eyebrow: 'BCS · Bank · NTRCA · Primary · Government Jobs',
      titleBefore: 'Your Academy',
      titleHighlight: '',
      titleAfter: '',
      description:
        'Your Complete Preparation Partner for BCS, Bank & Government Jobs.',
      primaryCta: {
        label: 'Create free account',
        href: '/register',
        visible: true,
      },
      secondaryCta: {
        label: 'Explore Question Bank',
        href: '/preli-question-bank',
        visible: true,
      },
      // Placeholders only — public homepage replaces these with GET /public/stats.
      stats: [
        { iconKey: 'book', value: '—', label: 'Published MCQs' },
        { iconKey: 'grad', value: '—', label: 'Exam categories' },
        { iconKey: 'trophy', value: '—', label: 'Practice sets' },
      ],
      backgroundToken: 'inverse',
    },
    categories: {
      visible: true,
      heading: 'Target exam categories',
      subtitle: 'Browse the Preli bank by the exams you are preparing for',
      cta: { label: 'View all categories', href: '/question-bank-categories', visible: true },
      tiles: [
        {
          id: 'bcs',
          displayTitle: 'BCS',
          subtitle: 'Preliminary focus',
          iconKey: 'bcs',
          categoryId: null,
          fallbackHref: '/preli-question-bank?q=BCS',
          visible: true,
        },
        {
          id: 'bank',
          displayTitle: 'Bank',
          subtitle: 'Officer & SO',
          iconKey: 'bank',
          categoryId: null,
          fallbackHref: '/preli-question-bank?q=Bank',
          visible: true,
        },
        {
          id: 'gov',
          displayTitle: 'Government Jobs',
          subtitle: '',
          iconKey: 'gov',
          categoryId: null,
          fallbackHref: '/preli-question-bank?q=Government',
          visible: true,
        },
        {
          id: 'ntrca',
          displayTitle: 'Primary & NTRCA',
          subtitle: '',
          iconKey: 'grad',
          categoryId: null,
          fallbackHref: '/preli-question-bank?q=NTRCA',
          visible: true,
        },
        {
          id: HOMEPAGE_OTHERS_TILE_ID,
          displayTitle: HOMEPAGE_OTHERS_DISPLAY_TITLE,
          subtitle: '',
          iconKey: 'gear',
          categoryId: null,
          fallbackHref: '/question-bank-categories',
          visible: true,
        },
      ],
    },
    writtenCategories: {
      visible: true,
      heading: 'Written exam categories',
      subtitle: 'Browse the Written bank by the exams you are preparing for',
      cta: {
        label: 'View all categories',
        href: '/written-question-bank-categories',
        visible: true,
      },
      tiles: [
        {
          id: 'wrt-bcs',
          displayTitle: 'BCS Written',
          subtitle: 'Written Exams',
          iconKey: 'bcs',
          categoryId: null,
          subcategoryId: null,
          fallbackHref: '/written-question-bank?q=BCS',
          visible: true,
        },
        {
          id: 'wrt-bank',
          displayTitle: 'Bank Written',
          subtitle: 'Written Exams',
          iconKey: 'bank',
          categoryId: null,
          subcategoryId: null,
          fallbackHref: '/written-question-bank?q=Bank',
          visible: true,
        },
        {
          id: 'wrt-gov',
          displayTitle: 'Government Jobs',
          subtitle: 'Written Exams',
          iconKey: 'gov',
          categoryId: null,
          subcategoryId: null,
          fallbackHref: '/written-question-bank?q=Government',
          visible: true,
        },
        {
          id: 'wrt-ntrca',
          displayTitle: 'Primary & NTRCA',
          subtitle: 'Written Exams',
          iconKey: 'grad',
          categoryId: null,
          subcategoryId: null,
          fallbackHref: '/written-question-bank?q=NTRCA',
          visible: true,
        },
        {
          id: HOMEPAGE_OTHERS_TILE_ID,
          displayTitle: HOMEPAGE_OTHERS_DISPLAY_TITLE,
          subtitle: '',
          iconKey: 'gear',
          categoryId: null,
          subcategoryId: null,
          fallbackHref: '/written-question-bank-categories',
          visible: true,
        },
      ],
    },
    topics: {
      visible: true,
      heading: 'Topic Base Question Analysis',
      subheading: '',
      subtitle:
        'Explore subject-wise questions and practice important topics to strengthen your knowledge and prepare more effectively for competitive exams.',
      cta: { label: 'View all topics', href: '/topic-categories', visible: true },
      // Public homepage / All Topics use live TOPIC taxonomy (DEC-042).
      // CMS keeps only the locked Others tile for section chrome — no demo subjects.
      tiles: [createDefaultOthersTopicTile('/topic-categories')],
    },
    why: {
      visible: true,
      eyebrow: 'Why us',
      heading: 'Why Your Academy?',
      points: [
        'Published Preli MCQs you can browse without logging in',
        'Create an account to bookmark, practice, and track progress',
        'Topic and category filters for focused practice',
        'পত্রিকার গুরুত্বপূর্ণ কলাম — published PDF columns',
        'Timed practice sets and mock-style exams when signed in',
        'Bookmarks, activity, and performance on your dashboard',
      ],
    },
    // Fabricated learner metrics must never ship on the public homepage.
    progress: {
      visible: false,
      heading: 'Track your progress',
      metrics: [],
      trendCaption: 'Sign in to see your real attempt history and accuracy.',
    },
    ctaBanner: {
      visible: true,
      heading: 'Create your free account',
      body: 'Register to bookmark questions, take timed practice, and follow your dashboard. Browse the public Preli bank anytime.',
      cta: { label: 'Create free account', href: '/register', visible: true },
    },
    latest: {
      visible: true,
      eyebrow: 'Uploads',
      heading: 'Latest question collections',
      subtitle: 'Newest published uploads from the Preli bank.',
      cta: { label: 'Open Preli Question Bank', href: '/preli-question-bank', visible: true },
      limit: 6,
    },
    newsletter: {
      visible: true,
      title: 'Ready to practice?',
      body: 'Create a free account to save bookmarks and practice on your dashboard. Email newsletters are not live yet.',
      cta: { label: 'Create free account', href: '/register', visible: true },
    },
  });
}
