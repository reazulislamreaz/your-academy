import { z } from 'zod';

const shortText = z.string().max(200);
const mediumText = z.string().max(500);
const longText = z.string().max(4000);
const hrefSchema = z.string().min(1).max(500);

const ctaSchema = z.object({
  label: shortText,
  href: hrefSchema,
  visible: z.boolean().default(true),
});

/** Built-in homepage sections (orderable / hideable via CMS layout). */
export const HOMEPAGE_BUILTIN_SECTION_IDS = [
  'hero',
  'trialStrip',
  'liveStats',
  'categories',
  'writtenCategories',
  'topics',
  'sampleMcq',
  'productFeatures',
  'howItWorks',
  'dashboardPreview',
  'why',
  'latest',
  'newsStrip',
  'accessFaq',
  'ctaBanner',
  'newsletter',
] as const;

export type HomepageBuiltinSectionId = (typeof HOMEPAGE_BUILTIN_SECTION_IDS)[number];

export const HOMEPAGE_SECTION_LABELS: Record<HomepageBuiltinSectionId, string> = {
  hero: 'Hero',
  trialStrip: 'Trial strip',
  liveStats: 'Live stats',
  categories: 'Question bank categories',
  writtenCategories: 'Written bank categories',
  topics: 'Topic Base Question Analysis',
  sampleMcq: 'Sample MCQ',
  productFeatures: 'Product features',
  howItWorks: 'How it works',
  dashboardPreview: 'Dashboard preview',
  why: 'Why Your Academy',
  latest: 'Latest collections',
  newsStrip: 'Newspaper columns',
  accessFaq: 'Access & FAQ',
  ctaBanner: 'Call to action',
  newsletter: 'Newsletter / final prompt',
};

const layoutEntrySchema = z.object({
  /** Builtin id or `custom:<id>` for admin-created blocks. */
  id: z.string().min(1).max(80),
  visible: z.boolean().default(true),
});

export const homepageLayoutSchema = z.object({
  sections: z.array(layoutEntrySchema).max(40).default([]),
});

export type HomepageLayout = z.infer<typeof homepageLayoutSchema>;

export function createDefaultHomepageLayout(): HomepageLayout {
  return {
    sections: HOMEPAGE_BUILTIN_SECTION_IDS.map((id) => ({ id, visible: true })),
  };
}

/** Ensure every builtin section appears once; preserve custom entries; sync visibility flags. */
export function normalizeHomepageLayout(
  layout: HomepageLayout | undefined | null,
  visibilityHints?: Partial<Record<HomepageBuiltinSectionId, boolean>>,
): HomepageLayout {
  const incoming = layout?.sections ?? [];
  const seen = new Set<string>();
  const next: HomepageLayout['sections'] = [];

  for (const entry of incoming) {
    const id = entry.id.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const hint =
      (HOMEPAGE_BUILTIN_SECTION_IDS as readonly string[]).includes(id) && visibilityHints
        ? visibilityHints[id as HomepageBuiltinSectionId]
        : undefined;
    next.push({
      id,
      visible: hint !== undefined ? hint : entry.visible,
    });
  }

  for (const id of HOMEPAGE_BUILTIN_SECTION_IDS) {
    if (seen.has(id)) continue;
    next.push({
      id,
      visible: visibilityHints?.[id] ?? true,
    });
  }

  return { sections: next };
}

export function isCustomLayoutSectionId(id: string): boolean {
  return id.startsWith('custom:');
}

export function customSectionIdFromLayoutId(layoutId: string): string | null {
  if (!isCustomLayoutSectionId(layoutId)) return null;
  return layoutId.slice('custom:'.length) || null;
}

export function toCustomLayoutId(customId: string): string {
  return `custom:${customId}`;
}

const featureItemSchema = z.object({
  id: z.string().min(1).max(64),
  title: shortText,
  body: mediumText,
  href: hrefSchema,
  cta: shortText,
  iconKey: z.string().min(1).max(40).default('book'),
});

const howStepSchema = z.object({
  step: z.string().min(1).max(8),
  title: shortText,
  body: mediumText,
});

const faqItemSchema = z.object({
  id: z.string().min(1).max(64),
  question: mediumText,
  answer: longText,
});

export const homepageExtendedSectionsSchema = z.object({
  trialStrip: z
    .object({
      visible: z.boolean().default(true),
      heading: mediumText,
      body: longText,
      cta: ctaSchema,
    })
    .default({
      visible: true,
      heading: '7-day free trial on every new account',
      body: 'Register to unlock correct answers, explanations, bookmarks, and timed practice for seven days from signup. After the trial, you can still browse questions — answers stay gated until a paid plan is available.',
      cta: { label: 'Start free trial', href: '/register', visible: true },
    }),
  liveStats: z
    .object({
      visible: z.boolean().default(true),
      heading: mediumText.optional().default(''),
    })
    .default({ visible: true, heading: '' }),
  sampleMcq: z
    .object({
      visible: z.boolean().default(true),
      eyebrow: shortText,
      ctaLabel: shortText,
      ctaHref: hrefSchema,
    })
    .default({
      visible: true,
      eyebrow: 'Sample from Preli bank',
      ctaLabel: 'Browse more questions',
      ctaHref: '/preli-question-bank',
    }),
  productFeatures: z
    .object({
      visible: z.boolean().default(true),
      heading: mediumText,
      subtitle: mediumText.optional().default(''),
      items: z.array(featureItemSchema).max(12).default([]),
    })
    .default({
      visible: true,
      heading: 'What you can do on Your Academy',
      subtitle: '',
      items: [
        {
          id: 'mcq',
          title: 'MCQ Question Bank',
          body: 'Browse published Preli MCQs with filters for topic, year, and exam tags — no login required to read questions.',
          href: '/preli-question-bank',
          cta: 'Browse Preli bank',
          iconKey: 'book',
        },
        {
          id: 'written',
          title: 'Written Question Bank',
          body: 'Dedicated written bank route for long-form practice materials as admins publish them.',
          href: '/written-question-bank',
          cta: 'Open written bank',
          iconKey: 'pen',
        },
        {
          id: 'topics',
          title: 'Topic-based practice',
          body: 'Jump into Bangla, English, Math, GK, ICT, and more from curated topic tiles.',
          href: '/topic-categories',
          cta: 'View topics',
          iconKey: 'clipboard',
        },
        {
          id: 'mocks',
          title: 'Mock tests & timed exams',
          body: 'Signed-in learners can take PracticeSet exams with timers, mark-for-review, and scored results.',
          href: '/register',
          cta: 'Create account to practice',
          iconKey: 'file',
        },
        {
          id: 'performance',
          title: 'Performance tracking',
          body: 'Your dashboard shows real attempts, accuracy, and subject performance after you practice — never placeholder scores.',
          href: '/login',
          cta: 'Sign in to dashboard',
          iconKey: 'chart',
        },
        {
          id: 'news',
          title: 'Newspaper columns',
          body: 'Admin-published PDF columns for current-affairs reading — open freely from the news library.',
          href: '/news',
          cta: 'Read columns',
          iconKey: 'newspaper',
        },
      ],
    }),
  howItWorks: z
    .object({
      visible: z.boolean().default(true),
      heading: mediumText,
      subtitle: mediumText,
      cta: ctaSchema,
      steps: z.array(howStepSchema).max(6).default([]),
    })
    .default({
      visible: true,
      heading: 'How Your Academy works',
      subtitle: 'A clear path from first visit to daily practice.',
      cta: { label: 'Create account', href: '/register', visible: true },
      steps: [
        {
          step: '01',
          title: 'Browse freely',
          body: 'Open the Preli Question Bank and newspaper columns without an account.',
        },
        {
          step: '02',
          title: 'Start your trial',
          body: 'Register with name, WhatsApp, and password. Your 7-day trial begins immediately.',
        },
        {
          step: '03',
          title: 'Practice & track',
          body: 'Unlock answers and explanations, take timed sets, bookmark questions, and follow progress on your dashboard.',
        },
      ],
    }),
  dashboardPreview: z
    .object({
      visible: z.boolean().default(true),
      heading: mediumText,
      body: longText,
      primaryCta: ctaSchema,
      secondaryCta: ctaSchema,
    })
    .default({
      visible: true,
      heading: 'Your study desk, after you sign in',
      body: 'Bookmarks, attempt history, timed practice, and accuracy come from your real activity — we never show placeholder scores on this page.',
      primaryCta: { label: 'Start free trial', href: '/register', visible: true },
      secondaryCta: { label: 'Sign in', href: '/login', visible: true },
    }),
  newsStrip: z
    .object({
      visible: z.boolean().default(true),
      heading: mediumText,
      subtitle: mediumText,
      cta: ctaSchema,
    })
    .default({
      visible: true,
      heading: 'পত্রিকার গুরুত্বপূর্ণ কলাম',
      subtitle: 'Published newspaper PDF columns from the admin library.',
      cta: { label: 'View all columns', href: '/news', visible: true },
    }),
  accessFaq: z
    .object({
      visible: z.boolean().default(true),
      heading: mediumText,
      body: longText,
      highlights: z.array(mediumText).max(8).default([]),
      cta: ctaSchema,
      faqHeading: mediumText,
      faqs: z.array(faqItemSchema).max(20).default([]),
    })
    .default({
      visible: true,
      heading: 'Access & pricing',
      body: 'Honest entitlements only. No invented student counts, success rates, or subscription prices.',
      highlights: [
        'Free to browse — Preli bank & published PDFs',
        '7-day trial — answers & explanations after signup',
        'Paid plans — coming in a later release',
      ],
      cta: { label: 'Start Your 7-Day Free Trial', href: '/register', visible: true },
      faqHeading: 'Frequently asked questions',
      faqs: [
        {
          id: 'trial',
          question: 'What is included in the 7-day free trial?',
          answer:
            'After registration, you get seven days of entitled access to correct answers, explanations, bookmarks, and timed practice. The trial is calculated from your signup timestamp on the server.',
        },
        {
          id: 'browse',
          question: 'Can I browse questions without paying?',
          answer:
            'Yes. The public Preli Question Bank and published newspaper PDF columns are available without login. Learner practice routes and answer privacy still follow entitlement rules.',
        },
        {
          id: 'after',
          question: 'What happens when the trial ends?',
          answer:
            'You can still sign in, browse, search, and save bookmarks. Correct answers and explanations are omitted from learner APIs until a future paid plan entitles you again.',
        },
        {
          id: 'paid',
          question: 'Is there a paid subscription price today?',
          answer:
            'Paid checkout is not live in v1. Subscription tables are ready for a future release — we will not invent prices on this page.',
        },
        {
          id: 'account',
          question: 'How do I create an account?',
          answer:
            'Use name, WhatsApp number, and password. Email is optional at registration and required only if you need password reset by email.',
        },
      ],
    }),
  customSections: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        heading: mediumText,
        body: longText,
        cta: ctaSchema,
        visible: z.boolean().default(true),
      }),
    )
    .max(20)
    .default([]),
});

export type HomepageExtendedSections = z.infer<typeof homepageExtendedSectionsSchema>;

export function createDefaultExtendedSections(): HomepageExtendedSections {
  return homepageExtendedSectionsSchema.parse({});
}
