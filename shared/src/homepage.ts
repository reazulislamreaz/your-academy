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
  categoryId: z.string().uuid().nullable().optional(),
  fallbackHref: hrefSchema,
  visible: z.boolean().default(true),
});

const topicTileSchema = z.object({
  id: z.string().min(1).max(64),
  displayTitle: shortText,
  iconKey: z.enum(HOMEPAGE_ICON_KEYS),
  categoryId: z.string().uuid().nullable().optional(),
  subcategoryId: z.string().uuid().nullable().optional(),
  fallbackHref: hrefSchema,
  visible: z.boolean().default(true),
});

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
    tiles: z.array(categoryTileSchema).max(20).default([]),
  }),
  topics: z.object({
    visible: z.boolean().default(true),
    heading: mediumText,
    cta: ctaSchema,
    tiles: z.array(topicTileSchema).max(20).default([]),
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

/** Default payload mirrors the current hardcoded marketing homepage. */
export function createDefaultHomepagePayload(): HomepagePayload {
  return homepagePayloadSchema.parse({
    hero: {
      visible: true,
      eyebrow: "Bangladesh's Premier Job Exam Preparation Platform",
      titleBefore: 'Your Dream Job Starts',
      titleHighlight: 'Here!',
      titleAfter: '',
      description:
        'Practice MCQs, Get Expert Solutions, and Boost Your Preparation for Govt. & Bank Jobs.',
      primaryCta: { label: 'Start Practicing', href: '/register', visible: true },
      secondaryCta: {
        label: 'Explore Question Bank',
        href: '/preli-question-bank',
        visible: true,
      },
      stats: [
        { iconKey: 'users', value: '1M+', label: 'Students' },
        { iconKey: 'book', value: '50+', label: 'Job Exams' },
        { iconKey: 'trophy', value: '100%', label: 'Focused on Your Success' },
      ],
      backgroundToken: 'inverse',
    },
    categories: {
      visible: true,
      heading: 'Our Question Bank Categories',
      subtitle: 'Choose your target exam and start your preparation',
      cta: { label: 'View All Exams', href: '/preli-question-bank', visible: true },
      tiles: [
        {
          id: 'bcs',
          displayTitle: 'BCS',
          subtitle: '(Preliminary + Written)',
          iconKey: 'bcs',
          categoryId: null,
          fallbackHref: '/preli-question-bank?q=BCS',
          visible: true,
        },
        {
          id: 'bank',
          displayTitle: 'Bank',
          subtitle: '(Officer & SO)',
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
      heading: 'Topic Base Question Analysis',
      cta: { label: 'View All Topics', href: '/preli-question-bank', visible: true },
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
          id: 'others',
          displayTitle: 'Others',
          iconKey: 'gear',
          categoryId: null,
          subcategoryId: null,
          fallbackHref: '/preli-question-bank',
          visible: true,
        },
      ],
    },
    why: {
      visible: true,
      heading: 'Why Choose Your Academy?',
      points: [
        'Weekly Update Question Bank',
        'Chapter-wise MCQ Practice',
        'প্রতিদিন পত্রিকার গুরুত্বপূর্ণ কলাম',
        'Unlimited Exam Practice',
        'Regular Update',
        'Performance Update',
      ],
    },
    progress: {
      visible: true,
      heading: 'Track Your Progress',
      metrics: [
        { value: '750', label: 'Total Attempted', iconKey: 'check', tone: 'info' },
        { value: '620', label: 'Correct', iconKey: 'check', tone: 'success' },
        { value: '130', label: 'Wrong', iconKey: 'xcircle', tone: 'danger' },
        { value: '82.7%', label: 'Accuracy', iconKey: 'percent', tone: 'insight' },
      ],
      trendCaption: 'Your Performance is improving!',
    },
    ctaBanner: {
      visible: true,
      heading: 'Ace Your Next Job Exam!',
      body: 'Join thousands of successful candidates with Your Academy.',
      cta: { label: 'Start Now', href: '/register', visible: true },
    },
    latest: {
      visible: true,
      heading: 'Latest Collections',
      subtitle: 'Newest admin uploads appear first.',
      cta: { label: 'Preli Question Bank', href: '/preli-question-bank', visible: true },
      limit: 6,
    },
    newsletter: {
      visible: true,
      title: 'Stay updated',
      body: "Create a free account for a seven-day trial with full answers and explanations. Email newsletters aren't live yet.",
      cta: { label: 'Start free trial', href: '/register', visible: true },
    },
  });
}
