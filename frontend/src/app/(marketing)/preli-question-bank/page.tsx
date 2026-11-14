'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PublicQuestionBank } from '@/features/public-question-bank/public-question-bank';

function PreliQuestionBankContent() {
  const search = useSearchParams();
  const q = search.get('q') ?? '';
  const year = search.get('year') ?? '';

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 sm:py-8">
      <PublicQuestionBank initialQ={q} initialYear={year} />
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
