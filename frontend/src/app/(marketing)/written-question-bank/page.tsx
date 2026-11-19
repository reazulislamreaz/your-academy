import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MarketingPage } from '@/components/layout/marketing-page';
import { ListCardSkeleton } from '@/components/loading';
import { WrittenQuestionBank } from '@/features/written-question-bank/public-question-bank';

export const metadata: Metadata = {
  title: 'Written Question Bank — Your Academy',
  description:
    'Browse written exam question sets for BCS and government job preparation. Search, filter by topic and year.',
};

function WrittenQuestionBankContent() {
  return (
    <MarketingPage density="compact">
      <WrittenQuestionBank />
    </MarketingPage>
  );
}

export default function WrittenQuestionBankPage() {
  return (
    <Suspense
      fallback={
        <MarketingPage density="compact">
          <ListCardSkeleton rows={4} rowClassName="min-h-24 py-5" />
        </MarketingPage>
      }
    >
      <WrittenQuestionBankContent />
    </Suspense>
  );
}
