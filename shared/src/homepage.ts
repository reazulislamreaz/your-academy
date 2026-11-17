import { z } from 'zod';

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
  categoryId: z.string().uuid().nullable().optional(),
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
 * How many visible tiles to show on the homepage before the Others card.
 * Admin managers list/reorder the full tile array — this limit is homepage-only.
 */
export const HOMEPAGE_SECTION_PREVIEW_LIMIT = 5;

/** Recommended square logo size for homepage category/topic tiles (px). */
export const HOMEPAGE_TILE_LOGO_SIZE = 256;

const progressMetricSchema = z.object({
  value: shortText,
  label: shortText,
  iconKey: z.enum(HOMEPAGE_ICON_KEYS),
  tone: z.enum(['info', 'success', 'danger', 'insight']).default('info'),
});

export const homepagePayloadSchema = z.object({
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

export type HomepagePayload = z.infer<typeof homepagePayloadSchema>;

/** Default payload mirrors the marketing homepage (honest copy; live stats override hero.stats). */
export function createDefaultHomepagePayload(): HomepagePayload {
  return homepagePayloadSchema.parse({
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
          id: 'other-gov',
          displayTitle: 'Other Govt. Jobs',
          subtitle: '',
          iconKey: 'gear',
          categoryId: null,
          fallbackHref: '/preli-question-bank',
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
