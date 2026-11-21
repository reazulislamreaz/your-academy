import {
  createDefaultHomepagePayload,
  normalizeHomepagePayload,
  type HomepagePayload,
} from '@your-academy/shared';
import type { PublicPlatformStats } from '@/lib/api/public-stats';

const FABRICATED_STAT_VALUES = new Set(['1M+', '50+', '100%']);

function formatCount(n: number): string {
  return new Intl.NumberFormat('en-BD').format(n);
}

/** Detect pre-redesign CMS copy that included fabricated social proof. */
export function isLegacyHomepageHero(hero: HomepagePayload['hero']): boolean {
  if (/boost your knowledge/i.test(hero.description.trim())) return true;
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

type Cta = HomepagePayload['hero']['primaryCta'];

function scrubTrialCta(cta: Cta, fallbackLabel: string): Cta {
  if (!mentionsTrial(cta.label)) return cta;
  return { ...cta, label: fallbackLabel };
}

function scrubTrialText(text: string, fallback: string): string {
  return mentionsTrial(text) ? fallback : text;
}

/**
 * Presentation merge for the public homepage.
 *
 * CMS published payload is the source of truth. We only:
 * - scrub free-trial CTA / copy (product rule: trials disabled)
 * - strip fabricated hero social-proof stats (brand-first; live counts live in Live Stats)
 * - force trialStrip / progress off
 *
 * Do NOT replace admin headings, descriptions, or other copy with defaults —
 * that made Admin Dashboard edits appear to "not save" on the live homepage.
 */
export function presentHomepagePayload(
  payload: HomepagePayload,
  _liveStats: PublicPlatformStats | null = null,
): HomepagePayload {
  void _liveStats;
  const defaults = createDefaultHomepagePayload();

  const heroSource = payload.hero;
  const primaryCta = scrubTrialCta(heroSource.primaryCta, defaults.hero.primaryCta.label);
  const secondaryCta = scrubTrialCta(
    heroSource.secondaryCta,
    defaults.hero.secondaryCta.label,
  );

  // Brand-first hero: never render hero social-proof chips.
  // Live platform counts render in HomepageLiveStats below the fold.
  // (Hero CMS has no stats editor; strip any legacy chips from older payloads.)
  const heroStats: HomepagePayload['hero']['stats'] = [];

  const scrubPoints = (points: string[], fallback: string[]) =>
    points.some((p) => mentionsTrial(p)) ? fallback : points;

  const why = {
    ...payload.why,
    heading: scrubTrialText(payload.why.heading, defaults.why.heading),
    points: scrubPoints(payload.why.points, defaults.why.points),
  };

  const ctaBanner = {
    ...payload.ctaBanner,
    heading: scrubTrialText(payload.ctaBanner.heading, defaults.ctaBanner.heading),
    body: scrubTrialText(payload.ctaBanner.body, defaults.ctaBanner.body),
    cta: scrubTrialCta(payload.ctaBanner.cta, defaults.ctaBanner.cta.label),
  };

  const newsletter = {
    ...payload.newsletter,
    body: scrubTrialText(payload.newsletter.body, defaults.newsletter.body),
    cta: scrubTrialCta(payload.newsletter.cta, defaults.newsletter.cta.label),
  };

  const howItWorks = {
    ...payload.howItWorks,
    steps: payload.howItWorks.steps.some(
      (s) => mentionsTrial(s.title) || mentionsTrial(s.body),
    )
      ? defaults.howItWorks.steps
      : payload.howItWorks.steps,
    cta: scrubTrialCta(payload.howItWorks.cta, defaults.howItWorks.cta.label),
  };

  const dashboardPreview = {
    ...payload.dashboardPreview,
    body: scrubTrialText(payload.dashboardPreview.body, defaults.dashboardPreview.body),
    primaryCta: scrubTrialCta(
      payload.dashboardPreview.primaryCta,
      defaults.dashboardPreview.primaryCta.label,
    ),
  };

  const accessFaq = {
    ...payload.accessFaq,
    highlights: scrubPoints(payload.accessFaq.highlights, defaults.accessFaq.highlights),
    faqs: payload.accessFaq.faqs.some(
      (f) => mentionsTrial(f.question) || mentionsTrial(f.answer),
    )
      ? defaults.accessFaq.faqs
      : payload.accessFaq.faqs,
    cta: scrubTrialCta(payload.accessFaq.cta, defaults.accessFaq.cta.label),
  };

  return normalizeHomepagePayload({
    ...defaults,
    ...payload,
    layout: payload.layout ?? defaults.layout,
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
      ...heroSource,
      primaryCta,
      secondaryCta,
      // Empty after scrub → brand-first (no chips). Non-fabricated CMS stats still render.
      stats: heroStats,
    },
    categories: payload.categories,
    writtenCategories: payload.writtenCategories ?? defaults.writtenCategories,
    topics: {
      ...payload.topics,
      // Preserve empty subtitle — do not invent a lede when admin cleared it.
      subtitle: payload.topics.subtitle ?? '',
      subheading: payload.topics.subheading ?? '',
    },
    why,
    progress: { ...defaults.progress, visible: false },
    ctaBanner,
    latest: payload.latest,
    newsletter,
  });
}
