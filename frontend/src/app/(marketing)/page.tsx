import type { Metadata } from 'next';
import { createDefaultHomepagePayload } from '@your-academy/shared';
import { HomepageAccessFaq } from '@/components/marketing/homepage-access-faq';
import { HomepageBankBrowse } from '@/components/marketing/homepage-bank-browse';
import { HomepageDashboardPreview } from '@/components/marketing/homepage-dashboard-preview';
import { HomepageFinalCta } from '@/components/marketing/homepage-final-cta';
import { HomepageHero } from '@/components/marketing/homepage-hero';
import { HomepageHowItWorks } from '@/components/marketing/homepage-how-it-works';
import { HomepageLatestQuestions } from '@/components/marketing/homepage-latest-questions';
import { HomepageLiveStats } from '@/components/marketing/homepage-live-stats';
import { HomepageMidSections } from '@/components/marketing/homepage-mid-sections';
import { HomepageNewsStrip } from '@/components/marketing/homepage-news-strip';
import { HomepageProductFeatures } from '@/components/marketing/homepage-product-features';
import { HomepageSampleMcq } from '@/components/marketing/homepage-sample-mcq';
import { HomepageTrialStrip } from '@/components/marketing/homepage-trial-strip';
import { NewsletterBar } from '@/components/marketing/newsletter-bar';
import { Reveal } from '@/components/motion/reveal';
import { getPublicHomepage } from '@/lib/api/homepage';
import { getPublicPlatformStats } from '@/lib/api/public-stats';
import {
  HOMEPAGE_SUPPORTING_COPY,
  presentHomepagePayload,
} from '@/lib/marketing/homepage-presentation';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://youracademy.com.bd';

export const metadata: Metadata = {
  title: 'Your Academy — BCS, Bank & Government Job Exam Preparation',
  description:
    'Practice published MCQs for BCS, Bank, NTRCA, Primary Teacher, and government jobs. Start a 7-day free trial for answers, explanations, and timed practice — all on Your Academy Bangladesh.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Your Academy — Complete Job Exam Preparation',
    description:
      'Browse the Preli Question Bank, read newspaper columns, and start a 7-day free trial for answers and mock-style practice.',
    url: SITE_URL,
    siteName: 'Your Academy',
    locale: 'en_BD',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Your Academy — BCS, Bank & Government Jobs',
    description:
      'MCQ practice, newspaper columns, and a 7-day free trial for Bangladeshi job exam candidates.',
  },
};

export const revalidate = 60;

async function loadHomepage() {
  try {
    return await getPublicHomepage();
  } catch {
    return {
      payload: createDefaultHomepagePayload(),
      heroImageUrl: null as string | null,
      publishedAt: null as string | null,
      updatedAt: new Date().toISOString(),
    };
  }
}

export default async function HomePage() {
  const [home, liveStats] = await Promise.all([loadHomepage(), getPublicPlatformStats()]);
  const payload = presentHomepagePayload(home.payload, liveStats);
  const { heroImageUrl } = home;

  return (
    <div className="bg-[var(--bg-desk)]">
      <HomepageHero
        hero={payload.hero}
        heroImageUrl={heroImageUrl}
        supportingText={HOMEPAGE_SUPPORTING_COPY}
      />
      <HomepageTrialStrip />
      <HomepageLiveStats stats={liveStats} />
      <HomepageBankBrowse categories={payload.categories} topics={payload.topics} />
      <HomepageSampleMcq />
      <HomepageProductFeatures />
      <HomepageHowItWorks />
      <HomepageDashboardPreview />
      <HomepageMidSections why={payload.why} />
      <HomepageLatestQuestions latest={payload.latest} />
      <HomepageNewsStrip />
      <HomepageAccessFaq />
      <HomepageFinalCta ctaBanner={payload.ctaBanner} />
      <section className="pb-[var(--space-section)]">
        <Reveal className="marketing-container">
          <NewsletterBar newsletter={payload.newsletter} />
        </Reveal>
      </section>
    </div>
  );
}
