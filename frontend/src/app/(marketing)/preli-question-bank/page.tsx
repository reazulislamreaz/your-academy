import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MarketingPage } from '@/components/layout/marketing-page';
import { ListCardSkeleton } from '@/components/loading';
import { PublicQuestionBank } from '@/features/public-question-bank/public-question-bank';

export const metadata: Metadata = {
  title: 'Preli Question Bank — Your Academy',
  description:
    'Browse published preliminary MCQ collections for BCS, Bank, NTRCA, and government job exams. Filter by subcategory and year.',
};

function PreliQuestionBankContent() {
  return (
    <MarketingPage density="compact">
      <PublicQuestionBank />
    </MarketingPage>
  );
}

export default function PreliQuestionBankPage() {
  return (
    <Suspense
      fallback={
        <MarketingPage density="compact">
          <ListCardSkeleton rows={5} />
        </MarketingPage>
      }
    >
      <PreliQuestionBankContent />
    </Suspense>
  );
}
