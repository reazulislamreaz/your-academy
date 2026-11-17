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

/** True when the tile is the reserved Others slot (by id or legacy title). */
export function isHomepageOthersTile(tile: Pick<HomepageTileLike, 'id' | 'displayTitle'>): boolean {
  if (tile.id === HOMEPAGE_OTHERS_TILE_ID) return true;
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
 * Enforce: exactly one Others tile, always visible, always at position 5
 * (immediately after the first 4 non-Others tiles). Remaining tiles follow.
 * Deduplicates Others and strips accidental duplicate ids among regular tiles.
 */
export function normalizeHomepageSectionTiles<T extends HomepageTileLike>(
  tiles: T[],
  createOthers: () => T,
): T[] {
  const othersSources: T[] = [];
  const regular: T[] = [];
  const seenRegularIds = new Set<string>();

  for (const tile of tiles) {
    if (isHomepageOthersTile(tile)) {
      othersSources.push(tile);
      continue;
    }
    if (seenRegularIds.has(tile.id)) continue;
    seenRegularIds.add(tile.id);
    regular.push(tile);
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

  const top = regular.slice(0, HOMEPAGE_EDITABLE_PREVIEW_SLOTS);
  const rest = regular.slice(HOMEPAGE_EDITABLE_PREVIEW_SLOTS);
  return [...top, others, ...rest];
}

/** Split normalized tiles into top-4, fixed Others, and remaining. */
export function splitHomepageSectionTiles<T extends HomepageTileLike>(tiles: T[]): {
  top: T[];
  others: T | null;
  rest: T[];
} {
  const normalizedHint = tiles;
  const othersIndex = normalizedHint.findIndex((t) => isHomepageOthersTile(t));
  if (othersIndex < 0) {
    return {
      top: normalizedHint.slice(0, HOMEPAGE_EDITABLE_PREVIEW_SLOTS),
      others: null,
      rest: normalizedHint.slice(HOMEPAGE_EDITABLE_PREVIEW_SLOTS),
    };
  }
  const others = normalizedHint[othersIndex]!;
  const withoutOthers = [
    ...normalizedHint.slice(0, othersIndex),
    ...normalizedHint.slice(othersIndex + 1),
  ];
  return {
    top: withoutOthers.slice(0, HOMEPAGE_EDITABLE_PREVIEW_SLOTS),
    others,
    rest: withoutOthers.slice(HOMEPAGE_EDITABLE_PREVIEW_SLOTS),
  };
}

/** Promote a regular tile into the Top 4 (never displaces Others). */
export function promoteTileIntoHomepageTop<T extends HomepageTileLike>(
  tiles: T[],
  tileId: string,
  createOthers: () => T,
): T[] {
  const normalized = normalizeHomepageSectionTiles(tiles, createOthers);
  const { top, others, rest } = splitHomepageSectionTiles(normalized);
  if (!others || isHomepageOthersTile({ id: tileId, displayTitle: '' })) {
    return normalized;
  }

  const inTop = top.findIndex((t) => t.id === tileId);
  if (inTop >= 0) {
    // Already in top — move to end of top (slot 4) so it stays among 1–4.
    const nextTop = [...top];
    const [item] = nextTop.splice(inTop, 1);
    nextTop.push(item!);
    return normalizeHomepageSectionTiles(
      [...nextTop, others, ...rest],
      createOthers,
    );
  }

  const fromRest = rest.findIndex((t) => t.id === tileId);
  if (fromRest < 0) return normalized;

  const nextRest = [...rest];
  const [item] = nextRest.splice(fromRest, 1);
  const ensured = { ...item!, visible: true };
  let nextTop = [...top, ensured];
  if (nextTop.length > HOMEPAGE_EDITABLE_PREVIEW_SLOTS) {
    const overflow = nextTop.slice(HOMEPAGE_EDITABLE_PREVIEW_SLOTS);
    nextTop = nextTop.slice(0, HOMEPAGE_EDITABLE_PREVIEW_SLOTS);
    nextRest.unshift(...overflow);
  }
  return normalizeHomepageSectionTiles(
    [...nextTop, others, ...nextRest],
    createOthers,
  );
}

/** Remove a regular tile from Top 4 into the remaining list (Others stays #5). */
export function demoteTileFromHomepageTop<T extends HomepageTileLike>(
  tiles: T[],
  tileId: string,
  createOthers: () => T,
): T[] {
  const normalized = normalizeHomepageSectionTiles(tiles, createOthers);
  const { top, others, rest } = splitHomepageSectionTiles(normalized);
  if (!others || isHomepageOthersTile({ id: tileId, displayTitle: '' })) {
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

/** Apply Others normalization to both homepage sections. */
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
    heading: mediumText,
    subtitle: mediumText,
    cta: ctaSchema,
    tiles: z.array(categoryTileSchema).max(200).default([]),
  }),
  topics: z.object({
    visible: z.boolean().default(true),
    heading: mediumText,
    cta: ctaSchema,
    tiles: z.array(topicTileSchema).max(200).default([]),
  }),
  why: z.object({
    visible: z.boolean().default(true),
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
        label: 'Start Your 7-Day Free Trial',
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
        { iconKey: 'trophy', value: '7 days', label: 'Free trial on signup' },
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
    topics: {
      visible: true,
      heading: 'Topic-based practice',
      cta: { label: 'View all topics', href: '/topic-categories', visible: true },
      tiles: [
        {
          id: 'bangla',
          displayTitle: 'Bangla',
          iconKey: 'bangla',
          categoryId: null,
          subcategoryId: null,
          fallbackHref: '/preli-question-bank?q=Bangla',
          visible: true,
        },
        {
          id: 'english',
          displayTitle: 'English',
          iconKey: 'english',
          categoryId: null,
          subcategoryId: null,
          fallbackHref: '/preli-question-bank?q=English',
          visible: true,
        },
        {
          id: 'math',
          displayTitle: 'Math',
          iconKey: 'math',
          categoryId: null,
          subcategoryId: null,
          fallbackHref: '/preli-question-bank?q=Math',
          visible: true,
        },
        {
          id: 'gk',
          displayTitle: 'GK',
          iconKey: 'gk',
          categoryId: null,
          subcategoryId: null,
          fallbackHref: '/preli-question-bank?q=GK',
          visible: true,
        },
        {
          id: HOMEPAGE_OTHERS_TILE_ID,
          displayTitle: HOMEPAGE_OTHERS_DISPLAY_TITLE,
          iconKey: 'gear',
          categoryId: null,
          subcategoryId: null,
          fallbackHref: '/topic-categories',
          visible: true,
        },
        {
          id: 'ict',
          displayTitle: 'ICT',
          iconKey: 'gear',
          categoryId: null,
          subcategoryId: null,
          fallbackHref: '/preli-question-bank?q=ICT',
          visible: true,
        },
      ],
    },
    why: {
      visible: true,
      heading: 'Why Your Academy?',
      points: [
        'Published Preli MCQs you can browse without logging in',
        '7-day free trial with answers and explanations after signup',
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
      heading: 'Start your 7-day free trial',
      body: 'Create an account to unlock answers, explanations, bookmarks, and timed practice. Browse the public Preli bank anytime.',
      cta: { label: 'Create free account', href: '/register', visible: true },
    },
    latest: {
      visible: true,
      heading: 'Latest question collections',
      subtitle: 'Newest published uploads from the Preli bank.',
      cta: { label: 'Open Preli Question Bank', href: '/preli-question-bank', visible: true },
      limit: 6,
    },
    newsletter: {
      visible: true,
      title: 'Ready to practice?',
      body: 'Register for a 7-day free trial. Email newsletters are not live yet — your account is the best way to stay on track.',
      cta: { label: 'Start free trial', href: '/register', visible: true },
    },
  });
}
