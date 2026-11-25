import type { Metadata } from 'next';
import { createDefaultHomepagePayload } from '@your-academy/shared';
import { HomepageSectionsRenderer } from '@/components/marketing/homepage-sections-renderer';
import { getPublicHomepage } from '@/lib/api/homepage';
import { getPublicDocumentsServer } from '@/lib/api/public-documents';
import { getPublicQuestionsServer } from '@/lib/api/public-questions';
import { getPublicPlatformStats } from '@/lib/api/public-stats';
import { presentHomepagePayload } from '@/lib/marketing/homepage-presentation';
import { JsonLd, organizationAndWebsiteJsonLd } from '@/lib/seo/json-ld';
import { SITE_URL } from '@/lib/seo/site';
import '@/styles/homepage-polish.css';

export const metadata: Metadata = {
  // Absolute: the root template would otherwise append "· Your Academy" a second time.
  title: { absolute: 'Your Academy — BCS, Bank & Government Job Exam Preparation' },
  description:
    'Practice published MCQs for BCS, Bank, NTRCA, Primary Teacher, and government jobs. Browse the Preli bank, read newspaper columns, and create a free account on Your Academy Bangladesh.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Your Academy — Complete Job Exam Preparation',
    description:
      'Browse the Preli Question Bank, read newspaper columns, and create a free account for bookmarks and practice tools.',
    url: SITE_URL,
    siteName: 'Your Academy',
    locale: 'en_BD',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Your Academy — BCS, Bank & Government Jobs',
    description:
      'MCQ practice and newspaper columns for Bangladeshi job exam candidates.',
  },
};

/** Fallback ISR; publish triggers on-demand `revalidateTag('homepage')` + `revalidatePath('/')`. */
export const revalidate = 15;

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
  const [home, liveStats, sampleMcq, newsDocs] = await Promise.all([
    loadHomepage(),
    getPublicPlatformStats(),
    getPublicQuestionsServer({ limit: 1 }),
    getPublicDocumentsServer({ limit: 4 }),
  ]);
  const payload = presentHomepagePayload(home.payload, liveStats);

  return (
    <>
      <JsonLd data={organizationAndWebsiteJsonLd()} />
      <HomepageSectionsRenderer
        payload={payload}
        heroImageUrl={home.heroImageUrl}
        liveStats={liveStats}
        sampleMcq={sampleMcq}
        newsDocs={newsDocs}
      />
    </>
  );
}
