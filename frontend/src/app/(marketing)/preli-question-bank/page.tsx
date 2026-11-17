import { Suspense } from 'react';
import { MarketingPage } from '@/components/layout/marketing-page';
import { ListCardSkeleton } from '@/components/loading/list-card-skeleton';
import { PublicQuestionBank } from '@/features/public-question-bank/public-question-bank';

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
