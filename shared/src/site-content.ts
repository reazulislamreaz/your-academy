import { z } from 'zod';

/**
 * Plan 2 (DEC-069) — admin-editable public text that used to be hard-coded. Stored inside the
 * existing homepage CMS payload (`homepage_content`), so it shares draft → publish, revisions
 * and cache purge. Every field defaults to the exact text that was live before, at FIELD level,
 * so stored payloads without these keys render unchanged.
 */

const label = z.string().trim().min(1).max(120);
const short = z.string().max(200);
const medium = z.string().max(500);
const long = z.string().max(2000);

/** Internal path ("/packages", "/#faq") or an https:// URL — never javascript:, //host, http:. */
export const siteLinkSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine(
    (v) => (v.startsWith('/') && !v.startsWith('//')) || /^https:\/\/[^\s]+$/i.test(v),
    'Use an internal path such as /packages, or a full https:// link',
  );

const linkItem = z.object({ label, href: siteLinkSchema });

/**
 * SEC-6 — script / data URLs and protocol-relative links (`//evil.example`) in older CMS link
 * fields. Browsers ignore whitespace and control characters inside the scheme, so strip them first.
 */
export function isUnsafeHref(value: string): boolean {
  // eslint-disable-next-line no-control-regex -- deliberately matching control characters
  const v = value.replace(/[\u0000-\u0020\u007f]+/g, '').toLowerCase();
  return (
    v.startsWith('javascript:') ||
    v.startsWith('data:') ||
    v.startsWith('vbscript:') ||
    v.startsWith('//') ||
    v.startsWith('\\\\') ||
    v.startsWith('/\\')
  );
}

/**
 * Link field of the older homepage sections. Same shape as before (any internal path, #anchor,
 * https:, mailto:, tel:), but an unsafe value is neutralised to "/" instead of rejected, so a
 * stored payload can never fail to parse on read (that would blank the homepage).
 */
export const cmsHrefSchema = z
  .string()
  .min(1)
  .max(500)
  .transform((v) => (isUnsafeHref(v) ? '/' : v));

// ─── Homepage section additions ───────────────────────────────────────────────

export const DEFAULT_HERO_QUICK_LINKS = [
  { label: 'BCS', href: '/preli-question-bank?q=BCS' },
  { label: 'Bank', href: '/preli-question-bank?q=Bank' },
  { label: 'Primary & NTRCA', href: '/preli-question-bank?q=NTRCA' },
  { label: 'Model Test', href: '/model-test' },
];
export const heroQuickLinksSchema = z.array(linkItem).max(8).default(DEFAULT_HERO_QUICK_LINKS);

export const DEFAULT_LIVE_STAT_LABELS = {
  questions: 'Published MCQs',
  questionSets: 'Collections',
  categories: 'Exam categories',
  documents: 'Newspaper columns',
};
export const liveStatLabelsSchema = z
  .object({
    questions: label.default(DEFAULT_LIVE_STAT_LABELS.questions),
    questionSets: label.default(DEFAULT_LIVE_STAT_LABELS.questionSets),
    categories: label.default(DEFAULT_LIVE_STAT_LABELS.categories),
    documents: label.default(DEFAULT_LIVE_STAT_LABELS.documents),
  })
  .default(DEFAULT_LIVE_STAT_LABELS);

export const DEFAULT_SAMPLE_MCQ_TEXT = {
  label: 'Live preview',
  heading: 'Try a real MCQ',
  bullets: [
    'Live question from the Preli bank',
    'Tap an option to check your answer instantly',
    'Same reading face used in practice mode',
  ],
  emptyTitle: 'No published questions yet',
  emptyDescription: 'When admins publish MCQs, a live sample will appear here.',
};

export const DEFAULT_DASHBOARD_TILES = [
  { label: 'Attempt history', hint: 'From your practice sessions' },
  { label: 'Accuracy', hint: 'Calculated from real answers' },
  { label: 'Timed exams', hint: 'Countdown + review' },
  { label: 'Bookmarks', hint: 'Save MCQs to revisit' },
];
/** Exactly four tiles — each keeps its icon by position. */
export const dashboardTilesSchema = z
  .array(z.object({ label, hint: short }))
  .length(4)
  .default(DEFAULT_DASHBOARD_TILES);

/** Access & Pricing card labels. Prices / per-month / savings stay computed. */
export const DEFAULT_PRICING_LABELS = {
  freeTitle: 'Free',
  freePrice: '৳0',
  freePriceNote: 'forever',
  freeDescription: 'Start practicing with an account — no card, no commitment.',
  paidDescriptionFallback: 'Unlock every question set, Model Test and premium PDF.',
  recommendedBadge: 'Recommended',
  perMonthSuffix: '/month',
  /** `{percent}` is replaced with the computed saving. */
  saveLabel: 'save {percent}%',
  upgradeLabel: 'Upgrade',
  contactLabel: 'Contact us to upgrade',
  currentPlanLabel: 'Current Plan',
  managePlanLabel: 'Manage plan',
  adminNote: 'Admins have full access',
  paidOffNotice: 'Everything is free right now.',
  footnote: 'Prices in BDT. One-time payment per plan — nothing renews automatically.',
  detailsLinkLabel: 'Plan details',
};
export type PricingLabels = typeof DEFAULT_PRICING_LABELS;
export const pricingLabelsSchema = z
  .object({
    freeTitle: label.default(DEFAULT_PRICING_LABELS.freeTitle),
    freePrice: z.string().trim().min(1).max(40).default(DEFAULT_PRICING_LABELS.freePrice),
    freePriceNote: short.default(DEFAULT_PRICING_LABELS.freePriceNote),
    freeDescription: medium.default(DEFAULT_PRICING_LABELS.freeDescription),
    paidDescriptionFallback: medium.default(DEFAULT_PRICING_LABELS.paidDescriptionFallback),
    recommendedBadge: z.string().trim().min(1).max(40).default(DEFAULT_PRICING_LABELS.recommendedBadge),
    perMonthSuffix: z.string().trim().min(1).max(40).default(DEFAULT_PRICING_LABELS.perMonthSuffix),
    saveLabel: z.string().trim().min(1).max(60).default(DEFAULT_PRICING_LABELS.saveLabel),
    upgradeLabel: label.default(DEFAULT_PRICING_LABELS.upgradeLabel),
    contactLabel: label.default(DEFAULT_PRICING_LABELS.contactLabel),
    currentPlanLabel: label.default(DEFAULT_PRICING_LABELS.currentPlanLabel),
    managePlanLabel: label.default(DEFAULT_PRICING_LABELS.managePlanLabel),
    adminNote: label.default(DEFAULT_PRICING_LABELS.adminNote),
    paidOffNotice: short.default(DEFAULT_PRICING_LABELS.paidOffNotice),
    footnote: medium.default(DEFAULT_PRICING_LABELS.footnote),
    detailsLinkLabel: label.default(DEFAULT_PRICING_LABELS.detailsLinkLabel),
  })
  .default(DEFAULT_PRICING_LABELS);

// ─── Footer ───────────────────────────────────────────────────────────────────

export const DEFAULT_FOOTER = {
  tagline:
    'Published Preli MCQs, Written question sets, and newspaper columns for serious exam prep.',
  accountHeading: 'Account',
  accountLinks: [
    { href: '/#faq', label: 'FAQ' },
    { href: '/register', label: 'Create free account' },
    { href: '/login', label: 'Sign in' },
    { href: '/privacy-policy', label: 'Privacy Policy' },
  ],
  helpText: 'Questions? Browse the FAQ or create a free account to bookmark and practice.',
  copyright: '© 2026 Your Academy. All rights reserved.',
};
export const footerContentSchema = z
  .object({
    tagline: medium.default(DEFAULT_FOOTER.tagline),
    accountHeading: label.default(DEFAULT_FOOTER.accountHeading),
    accountLinks: z.array(linkItem).max(10).default(DEFAULT_FOOTER.accountLinks),
    helpText: medium.default(DEFAULT_FOOTER.helpText),
    copyright: short.default(DEFAULT_FOOTER.copyright),
  })
  .default(DEFAULT_FOOTER);

// ─── Listing page headers ─────────────────────────────────────────────────────

export const PAGE_HEADER_KEYS = [
  'preli',
  'written',
  'modelTest',
  'quiz',
  'news',
  'packages',
  'writtenCategories',
] as const;
export type PageHeaderKey = (typeof PAGE_HEADER_KEYS)[number];

export const PAGE_HEADER_ROUTES: Record<PageHeaderKey, { route: string; name: string }> = {
  preli: { route: '/preli-question-bank', name: 'Preli Question Bank' },
  written: { route: '/written-question-bank', name: 'Written Question Bank' },
  modelTest: { route: '/model-test', name: 'Model Test' },
  quiz: { route: '/exams', name: 'Quiz' },
  news: { route: '/news', name: 'পত্রিকার গুরুত্বপূর্ণ কলাম' },
  packages: { route: '/packages', name: 'Packages' },
  writtenCategories: {
    route: '/written-question-bank-categories',
    name: 'All Written Subcategories',
  },
};

export type PageHeaderContent = {
  eyebrow: string;
  heading: string;
  description: string;
  /** Full browser / search title (no suffix is added). */
  metaTitle: string;
  metaDescription: string;
};

export const DEFAULT_PAGE_HEADERS: Record<PageHeaderKey, PageHeaderContent> = {
  preli: {
    eyebrow: 'Question bank',
    heading: 'Preli Question Bank – BCS, Bank & Government Job Preparation',
    description:
      'Practice previous year preliminary MCQs from BCS, bank, primary teacher and other government job exams. Each collection is one real exam paper with its date, so you can work through exam-based question sets, and the category, subcategory and year filters let you practice subject by subject. Open a collection to see every question with its correct answer.',
    metaTitle: 'Preli Question Bank | BCS, Bank & Government Job MCQ | Your Academy',
    metaDescription:
      'Practice previous year BCS, Bank, Primary and government job preliminary MCQs with subject-wise question collections on Your Academy.',
  },
  written: {
    eyebrow: 'Question bank',
    heading: 'Written Question Bank – BCS, Bank & Government Job Preparation',
    description:
      'Browse previous written examination questions from BCS, bank and other government job recruitment exams. Questions are organized into exam-wise collections, one per exam and date, and the subcategory and year filters support subject-wise written practice for BCS and bank written preparation.',
    metaTitle: 'Written Question Bank | BCS & Bank Written Preparation | Your Academy',
    metaDescription:
      'Explore previous BCS, Bank and government job written examination questions with organized question collections on Your Academy.',
  },
  modelTest: {
    eyebrow: '',
    heading: 'Model Test',
    description: '',
    metaTitle: 'Model Test · Your Academy',
    metaDescription: 'Take timed public Model Tests on Your Academy — search, filter, and review.',
  },
  quiz: {
    eyebrow: '',
    heading: 'Quiz',
    description: '',
    metaTitle: 'Quiz · Your Academy',
    metaDescription: 'Take timed public quizzes on Your Academy — newest first.',
  },
  news: {
    eyebrow: 'কলাম',
    heading: 'পত্রিকার গুরুত্বপূর্ণ কলাম',
    description: 'Admin-published PDF columns — browse and open freely, no login required.',
    metaTitle: 'পত্রিকার গুরুত্বপূর্ণ কলাম · Your Academy',
    metaDescription:
      'Browse admin-published newspaper PDF columns for BCS and government job current affairs. Free to open — no login required.',
  },
  packages: {
    eyebrow: 'Pricing',
    heading: 'Packages',
    description: 'Unlock every Preli and Written question set and every paid Model Test.',
    metaTitle: 'Packages · Your Academy',
    metaDescription:
      'Subscribe to unlock every Preli and Written question set and paid Model Test.',
  },
  writtenCategories: {
    eyebrow: '',
    heading: 'All Written Subcategories',
    description:
      'Explore every Written exam subcategory — tap a card to open the Written Question Bank filtered to that topic.',
    metaTitle: 'All Written Subcategories · Your Academy',
    metaDescription:
      'Browse every Written Question Bank subcategory and open filtered collections on Your Academy.',
  },
};

const pageHeaderSchema = (d: PageHeaderContent) =>
  z
    .object({
      eyebrow: z.string().max(80).default(d.eyebrow),
      heading: z.string().trim().min(1).max(200).default(d.heading),
      description: long.default(d.description),
      metaTitle: z.string().max(120).default(d.metaTitle),
      metaDescription: z.string().max(300).default(d.metaDescription),
    })
    .default(d);

export const pageHeadersSchema = z
  .object({
    preli: pageHeaderSchema(DEFAULT_PAGE_HEADERS.preli),
    written: pageHeaderSchema(DEFAULT_PAGE_HEADERS.written),
    modelTest: pageHeaderSchema(DEFAULT_PAGE_HEADERS.modelTest),
    quiz: pageHeaderSchema(DEFAULT_PAGE_HEADERS.quiz),
    news: pageHeaderSchema(DEFAULT_PAGE_HEADERS.news),
    packages: pageHeaderSchema(DEFAULT_PAGE_HEADERS.packages),
    writtenCategories: pageHeaderSchema(DEFAULT_PAGE_HEADERS.writtenCategories),
  })
  .default(DEFAULT_PAGE_HEADERS);
