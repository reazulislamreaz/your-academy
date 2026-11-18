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
      { iconKey: 'trophy', value: '7 days', label: 'Free trial on signup' },
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
      value: '7 days',
      label: 'Free trial on signup',
    },
  ];
}

/**
 * Presentation merge for the public homepage:
 * - Upgrade legacy CMS copy to the redesigned defaults
 * - Force-hide fabricated progress metrics (live counts render in HomepageLiveStats)
 * - Keep the hero brand-first (no fabricated or duplicate stat strip)
 */
export function presentHomepagePayload(
  payload: HomepagePayload,
  _liveStats: PublicPlatformStats | null = null,
): HomepagePayload {
  void _liveStats;
  const defaults = createDefaultHomepagePayload();
  const useDefaultsHero = isLegacyHomepageHero(payload.hero);
  const heroBase = useDefaultsHero ? defaults.hero : payload.hero;

  const why =
    payload.why.points.some((p) => /unlimited exam practice/i.test(p)) ||
    payload.why.points.some((p) => /performance update/i.test(p))
      ? defaults.why
      : payload.why;

  const ctaBanner =
    /thousands of successful/i.test(payload.ctaBanner.body) ||
    payload.ctaBanner.cta.label === 'Start Now'
      ? defaults.ctaBanner
      : payload.ctaBanner;

  const newsletter =
    /aren't live yet/i.test(payload.newsletter.body) &&
    payload.newsletter.title === 'Stay updated'
      ? defaults.newsletter
      : payload.newsletter;

  const latest =
    payload.latest.heading === 'Latest Collections' ? defaults.latest : payload.latest;

  const categories =
    payload.categories.heading === 'Our Question Bank Categories'
      ? { ...payload.categories, heading: defaults.categories.heading, subtitle: defaults.categories.subtitle, cta: { ...payload.categories.cta, label: defaults.categories.cta.label } }
      : payload.categories;

  const legacyTopicHeadings = new Set([
    'Topic Based Question Analysis',
    'Topics-Based Question Analysis',
    'Topic-based practice',
  ]);
  const topicsBase = legacyTopicHeadings.has(payload.topics.heading.trim())
    ? {
        ...payload.topics,
        heading: defaults.topics.heading,
        cta: { ...payload.topics.cta, label: defaults.topics.cta.label },
      }
    : payload.topics;
  const legacyTopicSubtitles = new Set([
    'Master Every Subject, One Topic at a Time',
    'Explore subject-wise and topic-wise questions to strengthen your knowledge and improve your exam preparation.',
  ]);
  const topicSubtitle = topicsBase.subtitle?.trim() ?? '';
  const topics = {
    ...topicsBase,
    // Categories pattern: heading + one description only — never surface a subheading.
    subheading: '',
    subtitle:
      !topicSubtitle || legacyTopicSubtitles.has(topicSubtitle)
        ? defaults.topics.subtitle
        : topicSubtitle,
  };

  return normalizeHomepagePayload({
    ...defaults,
    ...payload,
    layout: payload.layout ?? defaults.layout,
    trialStrip: payload.trialStrip ?? defaults.trialStrip,
    liveStats: payload.liveStats ?? defaults.liveStats,
    sampleMcq: payload.sampleMcq ?? defaults.sampleMcq,
    productFeatures: payload.productFeatures ?? defaults.productFeatures,
    howItWorks: payload.howItWorks ?? defaults.howItWorks,
    dashboardPreview: payload.dashboardPreview ?? defaults.dashboardPreview,
    newsStrip: payload.newsStrip ?? defaults.newsStrip,
    accessFaq: payload.accessFaq ?? defaults.accessFaq,
    customSections: payload.customSections ?? defaults.customSections,
    hero: {
      ...heroBase,
      // Live counts live in HomepageLiveStats (below the fold); keep hero brand-first.
      stats: [],
    },
    categories,
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
