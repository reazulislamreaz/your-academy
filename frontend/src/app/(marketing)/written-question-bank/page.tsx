import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MarketingPage } from '@/components/layout/marketing-page';
import { PageHeader } from '@/components/layout/page-header';
import { ListCardSkeleton } from '@/components/loading';
import { WrittenQuestionBank } from '@/features/written-question-bank/public-question-bank';
import type { PublicWrittenQuestionSet } from '@/lib/api/written-questions';
import { fetchPublicList } from '@/lib/seo/fetch-public';

const TITLE = 'Written Question Bank | BCS & Bank Written Preparation | Your Academy';
const DESCRIPTION =
  'Explore previous BCS, Bank and government job written examination questions with organized question collections on Your Academy.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/written-question-bank' },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/written-question-bank',
    type: 'website',
    siteName: 'Your Academy',
  },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const FILTER_KEYS = ['q', 'categoryId', 'subcategoryId', 'year'] as const;

/**
 * Server-rendered H1 + intro and the first page of collections, so crawlers get real content
 * (the list used to load only in the browser). Filters, search and paging stay client-side.
 */
export default async function WrittenQuestionBankPage({ searchParams }: Props) {
  const sp = await searchParams;
  const filtered = FILTER_KEYS.some((k) => Boolean(sp[k]));
  const initialSets = filtered
    ? null
    : await fetchPublicList<PublicWrittenQuestionSet>('/public/written-question-sets?limit=20');

  return (
    <MarketingPage density="compact">
      <PageHeader
        eyebrow="Question bank"
        title="Written Question Bank – BCS, Bank & Government Job Preparation"
        description="Browse previous written examination questions from BCS, bank and other government job recruitment exams. Questions are organized into exam-wise collections, one per exam and date, and the subcategory and year filters support subject-wise written practice for BCS and bank written preparation."
      />
      <Suspense fallback={<ListCardSkeleton rows={4} rowClassName="min-h-24 py-5" />}>
        <WrittenQuestionBank initialSets={initialSets ?? undefined} />
      </Suspense>
    </MarketingPage>
  );
}
