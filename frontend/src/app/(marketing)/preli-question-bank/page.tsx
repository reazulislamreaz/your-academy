'use client';

import { Suspense } from 'react';
import { PublicQuestionBank } from '@/features/public-question-bank/public-question-bank';

function PreliQuestionBankContent() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 sm:py-8">
      <PublicQuestionBank />
    </div>
  );
}

export default function PreliQuestionBankPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-[1100px] px-4 py-10 text-sm text-[var(--muted)]">
          Loading collections…
        </div>
      }
    >
      <PreliQuestionBankContent />
    </Suspense>
  );
}
