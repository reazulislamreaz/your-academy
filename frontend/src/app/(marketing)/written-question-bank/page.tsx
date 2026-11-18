import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MarketingPage } from '@/components/layout/marketing-page';
import { PageHeader } from '@/components/layout/page-header';
import { ListCardSkeleton } from '@/components/loading';
import { WrittenQuestionBank } from '@/features/written-question-bank/public-question-bank';

export const metadata: Metadata = {
  title: 'Written Question Bank — Your Academy',
  description:
    'Browse written exam question sets for BCS and government job preparation. Search, filter by topic and year, and review model answers.',
};

export default function WrittenQuestionBankPage() {
  return (
    <MarketingPage>
      <PageHeader
        eyebrow="Practice"
        title="Written Question Bank"
        description="Descriptive and written exam collections with model answers — organized like the Preli bank."
      />
      <Suspense
        fallback={
          <ListCardSkeleton rows={4} rowClassName="min-h-24 py-5" />
        }
      >
        <WrittenQuestionBank />
      </Suspense>
    </MarketingPage>
  );
}
