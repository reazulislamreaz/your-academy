'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { PublicQuestionBank } from '@/features/public-question-bank/public-question-bank';

function PreliQuestionBankContent() {
  const search = useSearchParams();
  const q = search.get('q') ?? '';

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow="Public question bank"
        title="Preli Question Bank"
        description="Each admin upload appears as its own question set. Browse without signing in — use Show/Hide All Answers anytime. Sign in only to save questions."
      />
      <PublicQuestionBank initialQ={q} />
    </div>
  );
}

export default function PreliQuestionBankPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-[1100px] px-4 py-10 text-sm text-[var(--muted)]">
          Loading question bank…
        </div>
      }
    >
      <PreliQuestionBankContent />
    </Suspense>
  );
}
