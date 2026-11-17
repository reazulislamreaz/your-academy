import type { Metadata } from 'next';
import { createDefaultHomepagePayload } from '@your-academy/shared';
import { HomepageSectionsRenderer } from '@/components/marketing/homepage-sections-renderer';
import { getPublicHomepage } from '@/lib/api/homepage';
import { getPublicDocumentsServer } from '@/lib/api/public-documents';
import { getPublicQuestionsServer } from '@/lib/api/public-questions';
import { getPublicPlatformStats } from '@/lib/api/public-stats';
import { presentHomepagePayload } from '@/lib/marketing/homepage-presentation';

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
  const [home, liveStats, sampleMcq, newsDocs] = await Promise.all([
    loadHomepage(),
    getPublicPlatformStats(),
    getPublicQuestionsServer({ limit: 1 }),
    getPublicDocumentsServer({ limit: 4 }),
  ]);
  const payload = presentHomepagePayload(home.payload, liveStats);

  return (
    <HomepageSectionsRenderer
      payload={payload}
      heroImageUrl={home.heroImageUrl}
      liveStats={liveStats}
      sampleMcq={sampleMcq}
      newsDocs={newsDocs}
    />
  );
}
