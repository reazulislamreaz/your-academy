import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MarketingPage } from '@/components/layout/marketing-page';
import { PageHeader } from '@/components/layout/page-header';
import { ListCardSkeleton } from '@/components/loading/list-card-skeleton';
import { PublicQuestionBank } from '@/features/public-question-bank/public-question-bank';
import type { PublicQuestionSet } from '@/lib/api/public-questions';
import { fetchPublicList } from '@/lib/seo/fetch-public';

const TITLE = 'Preli Question Bank | BCS, Bank & Government Job MCQ | Your Academy';
const DESCRIPTION =
  'Practice previous year BCS, Bank, Primary and government job preliminary MCQs with subject-wise question collections on Your Academy.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/preli-question-bank' },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/preli-question-bank',
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
export default async function PreliQuestionBankPage({ searchParams }: Props) {
  const sp = await searchParams;
  const filtered = FILTER_KEYS.some((k) => Boolean(sp[k]));
  const initialSets = filtered
    ? null
    : await fetchPublicList<PublicQuestionSet>('/public/question-sets?limit=20');

  return (
    <MarketingPage density="compact">
      <PageHeader
        eyebrow="Question bank"
        title="Preli Question Bank – BCS, Bank & Government Job Preparation"
        description="Practice previous year preliminary MCQs from BCS, bank, primary teacher and other government job exams. Each collection is one real exam paper with its date, so you can work through exam-based question sets, and the category, subcategory and year filters let you practice subject by subject. Open a collection to see every question with its correct answer."
      />
      <Suspense fallback={<ListCardSkeleton rows={5} />}>
        <PublicQuestionBank initialSets={initialSets ?? undefined} />
      </Suspense>
    </MarketingPage>
  );
}
