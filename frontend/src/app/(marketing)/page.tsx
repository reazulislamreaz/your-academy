import type { Metadata } from 'next';
import { createDefaultHomepagePayload } from '@your-academy/shared';
import { HomepageBankBrowse } from '@/components/marketing/homepage-bank-browse';
import { HomepageHero } from '@/components/marketing/homepage-hero';
import { HomepageLatestQuestions } from '@/components/marketing/homepage-latest-questions';
import { HomepageMidSections } from '@/components/marketing/homepage-mid-sections';
import { NewsletterBar } from '@/components/marketing/newsletter-bar';
import { Reveal } from '@/components/motion/reveal';
import { getPublicHomepage } from '@/lib/api/homepage';

export const metadata: Metadata = {
  title: 'Your Academy — Job Exam Preparation',
  description:
    "Bangladesh's Premier Job Exam Preparation Platform. Practice MCQs for Govt. & Bank Jobs.",
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
  const home = await loadHomepage();
  const { payload, heroImageUrl } = home;

  return (
    <div className="bg-[var(--bg-desk)]">
      <HomepageHero hero={payload.hero} heroImageUrl={heroImageUrl} />
      <HomepageBankBrowse categories={payload.categories} topics={payload.topics} />
      <HomepageMidSections
        why={payload.why}
        progress={payload.progress}
        ctaBanner={payload.ctaBanner}
      />
      <HomepageLatestQuestions latest={payload.latest} />
      <section className="pb-[var(--space-section)]">
        <Reveal className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
          <NewsletterBar newsletter={payload.newsletter} />
        </Reveal>
      </section>
    </div>
  );
}
