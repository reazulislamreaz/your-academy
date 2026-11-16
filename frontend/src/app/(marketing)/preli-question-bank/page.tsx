'use client';

import { Suspense } from 'react';
import { MarketingPage } from '@/components/layout/marketing-page';
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
          <p className="text-sm text-[var(--muted)]">Loading collections…</p>
        </MarketingPage>
      }
    >
      <PreliQuestionBankContent />
    </Suspense>
  );
}
