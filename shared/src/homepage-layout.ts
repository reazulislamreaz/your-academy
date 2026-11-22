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
  'latest',
  'categories',
  'writtenCategories',
  'topics',
  'sampleMcq',
  'productFeatures',
  'howItWorks',
  'dashboardPreview',
  'why',
  'newsStrip',
  'accessFaq',
  'ctaBanner',
  'newsletter',
] as const;

export type HomepageBuiltinSectionId = (typeof HOMEPAGE_BUILTIN_SECTION_IDS)[number];

export const HOMEPAGE_SECTION_LABELS: Record<HomepageBuiltinSectionId, string> = {
  hero: 'Hero',
  trialStrip: 'Account strip',
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

/**
 * Keep Written bank categories immediately under Preliminary categories so the
 * two exam-bank strips stay back-to-back on the marketing homepage.
 */
function pinWrittenCategoriesAfterPreli(
  sections: HomepageLayout['sections'],
): HomepageLayout['sections'] {
  const catIdx = sections.findIndex((s) => s.id === 'categories');
  const writtenIdx = sections.findIndex((s) => s.id === 'writtenCategories');
  if (catIdx < 0 || writtenIdx < 0 || writtenIdx === catIdx + 1) return sections;

  const next = [...sections];
  const [written] = next.splice(writtenIdx, 1);
  if (!written) return sections;
  const newCatIdx = next.findIndex((s) => s.id === 'categories');
  next.splice(newCatIdx + 1, 0, written);
  return next;
}

/**
 * Keep Latest collections immediately under Live platform library so the
 * library + uploads pair stays back-to-back on the marketing homepage.
 */
function pinLatestAfterLiveStats(sections: HomepageLayout['sections']): HomepageLayout['sections'] {
  const liveIdx = sections.findIndex((s) => s.id === 'liveStats');
  const latestIdx = sections.findIndex((s) => s.id === 'latest');
  if (liveIdx < 0 || latestIdx < 0 || latestIdx === liveIdx + 1) return sections;

  const next = [...sections];
  const [latest] = next.splice(latestIdx, 1);
  if (!latest) return sections;
  const newLiveIdx = next.findIndex((s) => s.id === 'liveStats');
  next.splice(newLiveIdx + 1, 0, latest);
  return next;
}

/** Insert a missing builtin at its canonical slot (not blindly at the end). */
function insertBuiltinAtCanonicalSlot(
  sections: HomepageLayout['sections'],
  id: HomepageBuiltinSectionId,
  visible: boolean,
): void {
  const canonicalIdx = HOMEPAGE_BUILTIN_SECTION_IDS.indexOf(id);
  let insertAt = sections.length;

  for (let i = 0; i < sections.length; i += 1) {
    const otherId = sections[i]!.id;
    const otherCanonical = (HOMEPAGE_BUILTIN_SECTION_IDS as readonly string[]).indexOf(otherId);
    if (otherCanonical >= 0 && otherCanonical < canonicalIdx) {
      insertAt = i + 1;
    }
  }

  if (insertAt === sections.length) {
    for (let i = 0; i < sections.length; i += 1) {
      const otherCanonical = (HOMEPAGE_BUILTIN_SECTION_IDS as readonly string[]).indexOf(
        sections[i]!.id,
      );
      if (otherCanonical > canonicalIdx) {
        insertAt = i;
        break;
      }
    }
  }

  sections.splice(insertAt, 0, { id, visible });
}

/**
 * Ensure every builtin section appears once; preserve custom entries.
 *
 * Layout `entry.visible` is the source of truth for existing rows (CMS
 * "Show this section on the homepage" toggle). `visibilityHints` only seed
 * *missing* builtins when hydrating legacy payloads that predate `layout`.
 */
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
    next.push({
      id,
      visible: entry.visible,
    });
  }

  for (const id of HOMEPAGE_BUILTIN_SECTION_IDS) {
    if (seen.has(id)) continue;
    insertBuiltinAtCanonicalSlot(next, id, visibilityHints?.[id] ?? true);
    seen.add(id);
  }

  return {
    sections: pinLatestAfterLiveStats(pinWrittenCategoriesAfterPreli(next)),
  };
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
      // Free trials disabled — section stays in layout schema but hidden by default.
      visible: false,
      heading: 'Create your free account',
      body: 'Register with name, WhatsApp, and password to bookmark questions, take timed practice, and use your dashboard. Browse the public Preli bank anytime.',
      cta: { label: 'Create free account', href: '/register', visible: true },
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
          body: 'Browse Topic Base subjects from the live Topics taxonomy — icons and order match Taxonomy → Topics.',
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
          title: 'Create your account',
          body: 'Register with name, WhatsApp, and password to save bookmarks and use learner practice tools.',
        },
        {
          step: '03',
          title: 'Practice & track',
          body: 'Take timed sets, bookmark questions, and follow progress on your dashboard.',
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
      primaryCta: { label: 'Create free account', href: '/register', visible: true },
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
        'Create an account — bookmarks, practice sets, and dashboard',
        'Paid plans — coming in a later release',
      ],
      cta: { label: 'Create free account', href: '/register', visible: true },
      faqHeading: 'Frequently asked questions',
      faqs: [
        {
          id: 'browse',
          question: 'Can I browse questions without paying?',
          answer:
            'Yes. The public Preli Question Bank and published newspaper PDF columns are available without login. Learner practice routes and answer privacy still follow entitlement rules.',
        },
        {
          id: 'account',
          question: 'How do I create an account?',
          answer:
            'Use name, WhatsApp number, and password. Email is optional at registration and required only if you need password reset by email.',
        },
        {
          id: 'answers',
          question: 'When can I see correct answers and explanations?',
          answer:
            'Correct answers and explanations are omitted from learner APIs until a future paid plan entitles you. You can still browse, search, and save bookmarks after signup.',
        },
        {
          id: 'paid',
          question: 'Is there a paid subscription price today?',
          answer:
            'Paid checkout is not live in v1. Subscription tables are ready for a future release — we will not invent prices on this page.',
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
