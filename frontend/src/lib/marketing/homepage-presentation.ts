import {
  createDefaultHomepagePayload,
  normalizeHomepagePayload,
  type HomepagePayload,
} from '@your-academy/shared';
import type { PublicPlatformStats } from '@/lib/api/public-stats';

const LEGACY_DESCRIPTIONS = new Set([
  'Boost Your Knowledge',
  'Boost your knowledge',
]);

const FABRICATED_STAT_VALUES = new Set(['1M+', '50+', '100%']);

function formatCount(n: number): string {
  return new Intl.NumberFormat('en-BD').format(n);
}

/** Detect pre-redesign CMS copy that included fabricated social proof. */
export function isLegacyHomepageHero(hero: HomepagePayload['hero']): boolean {
  if (LEGACY_DESCRIPTIONS.has(hero.description.trim())) return true;
  if (hero.stats.some((s) => FABRICATED_STAT_VALUES.has(s.value.trim()))) return true;
  if (hero.primaryCta.label === 'Start Practicing') return true;
  return false;
}

export function liveStatsToHeroStats(
  stats: PublicPlatformStats | null,
): HomepagePayload['hero']['stats'] {
  if (!stats) {
    return [
      { iconKey: 'book', value: '—', label: 'Published MCQs' },
      { iconKey: 'grad', value: '—', label: 'Exam categories' },
      { iconKey: 'trophy', value: '—', label: 'Practice sets' },
    ];
  }
  return [
    {
      iconKey: 'book',
      value: formatCount(stats.questions),
      label: 'Published MCQs',
    },
    {
      iconKey: 'grad',
      value: formatCount(stats.categories),
      label: 'Exam categories',
    },
    {
      iconKey: 'trophy',
      value: '—',
      label: 'Practice sets',
    },
  ];
}

function mentionsTrial(text: string): boolean {
  return /free\s*trial|7-?\s*day(?:\s+free)?\s*trial|7-?\s*day\s+free|start your trial|\btrial\b/i.test(
    text,
  );
}

/**
 * Field-level legacy upgrades only — never wholesale-replace a CMS section
 * when the admin has published intentional copy. Visibility and layout come
 * from the published payload (normalized). Free-trial promo copy is always scrubbed.
 */
export function presentHomepagePayload(
  payload: HomepagePayload,
  _liveStats: PublicPlatformStats | null = null,
): HomepagePayload {
  void _liveStats;
  const defaults = createDefaultHomepagePayload();
  const useDefaultsHero =
    isLegacyHomepageHero(payload.hero) ||
    mentionsTrial(payload.hero.primaryCta.label) ||
    mentionsTrial(payload.hero.description);
  const heroBase = useDefaultsHero ? defaults.hero : payload.hero;

  const why =
    payload.why.points.some((p) => /unlimited exam practice/i.test(p)) ||
    payload.why.points.some((p) => /performance update/i.test(p)) ||
    payload.why.points.some((p) => mentionsTrial(p))
      ? defaults.why
      : payload.why;

  const ctaBanner =
    /thousands of successful/i.test(payload.ctaBanner.body) ||
    payload.ctaBanner.cta.label === 'Start Now' ||
    mentionsTrial(payload.ctaBanner.heading) ||
    mentionsTrial(payload.ctaBanner.body) ||
    mentionsTrial(payload.ctaBanner.cta.label)
      ? defaults.ctaBanner
      : payload.ctaBanner;

  const newsletter =
    (/aren't live yet/i.test(payload.newsletter.body) &&
      payload.newsletter.title === 'Stay updated') ||
    mentionsTrial(payload.newsletter.body) ||
    mentionsTrial(payload.newsletter.cta.label)
      ? defaults.newsletter
      : payload.newsletter;

  const latest =
    payload.latest.heading === 'Latest Collections' ? defaults.latest : payload.latest;

  // Only swap known legacy heading/subtitle strings — keep admin tile order & rest.
  const categories = {
    ...payload.categories,
    heading:
      payload.categories.heading === 'Our Question Bank Categories'
        ? defaults.categories.heading
        : payload.categories.heading,
    subtitle:
      payload.categories.heading === 'Our Question Bank Categories'
        ? defaults.categories.subtitle
        : payload.categories.subtitle,
    cta:
      payload.categories.heading === 'Our Question Bank Categories'
        ? { ...payload.categories.cta, label: defaults.categories.cta.label }
        : payload.categories.cta,
  };

  const legacyTopicHeadings = new Set([
    'Topic Based Question Analysis',
    'Topics-Based Question Analysis',
    'Topic-based practice',
  ]);
  const legacyTopicSubtitles = new Set([
    'Master Every Subject, One Topic at a Time',
    'Explore subject-wise and topic-wise questions to strengthen your knowledge and improve your exam preparation.',
  ]);
  const topicHeading = payload.topics.heading.trim();
  const topicSubtitle = payload.topics.subtitle?.trim() ?? '';
  const topics = {
    ...payload.topics,
    heading: legacyTopicHeadings.has(topicHeading)
      ? defaults.topics.heading
      : payload.topics.heading,
    subheading: '',
    subtitle: legacyTopicSubtitles.has(topicSubtitle)
      ? defaults.topics.subtitle
      : payload.topics.subtitle,
    cta: legacyTopicHeadings.has(topicHeading)
      ? { ...payload.topics.cta, label: defaults.topics.cta.label }
      : payload.topics.cta,
  };

  const howItWorks =
    payload.howItWorks.steps.some((s) => mentionsTrial(s.title) || mentionsTrial(s.body)) ||
    mentionsTrial(payload.howItWorks.cta.label)
      ? defaults.howItWorks
      : payload.howItWorks;

  const dashboardPreview =
    mentionsTrial(payload.dashboardPreview.primaryCta.label) ||
    mentionsTrial(payload.dashboardPreview.body)
      ? defaults.dashboardPreview
      : payload.dashboardPreview;

  const accessFaq =
    payload.accessFaq.highlights.some((h) => mentionsTrial(h)) ||
    payload.accessFaq.faqs.some((f) => mentionsTrial(f.question) || mentionsTrial(f.answer)) ||
    mentionsTrial(payload.accessFaq.cta.label)
      ? defaults.accessFaq
      : payload.accessFaq;

  return normalizeHomepagePayload({
    ...defaults,
    ...payload,
    layout: payload.layout ?? defaults.layout,
    // Free trials disabled — never show the promotional strip even if CMS has it on.
    trialStrip: {
      ...(payload.trialStrip ?? defaults.trialStrip),
      visible: false,
    },
    liveStats: payload.liveStats ?? defaults.liveStats,
    sampleMcq: payload.sampleMcq ?? defaults.sampleMcq,
    productFeatures: payload.productFeatures ?? defaults.productFeatures,
    howItWorks,
    dashboardPreview,
    newsStrip: payload.newsStrip ?? defaults.newsStrip,
    accessFaq,
    customSections: payload.customSections ?? defaults.customSections,
    hero: {
      ...heroBase,
      // Live counts live in HomepageLiveStats (below the fold); keep hero brand-first.
      stats: [],
    },
    categories,
    writtenCategories: payload.writtenCategories ?? defaults.writtenCategories,
    topics,
    why,
    progress: { ...defaults.progress, visible: false },
    ctaBanner,
    latest,
    newsletter,
  });
}

export const HOMEPAGE_SUPPORTING_COPY =
  'Practice thousands of MCQs, prepare with previous-year style collections, take mock tests, and track your performance — all in one platform.';
