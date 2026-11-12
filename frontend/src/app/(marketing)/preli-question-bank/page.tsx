'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { PublicQuestionBank } from '@/features/public-question-bank/public-question-bank';

function PreliQuestionBankContent() {
  const search = useSearchParams();
  const q = search.get('q') ?? '';
  const examTag = search.get('examTag') ?? '';

  return (
    <div className="mx-auto w-full max-w-[960px] space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow="Public question bank"
        title="Preli Question Bank"
        description="Browse every published MCQ without signing in. Newest uploads appear first. Sign in only if you want to save questions."
      />
      <PublicQuestionBank initialQ={q} initialExamTag={examTag} />
    </div>
  );
}

export default function PreliQuestionBankPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-[960px] px-4 py-10 text-sm text-[var(--muted)]">
          Loading question bank…
        </div>
      }
    >
      <PreliQuestionBankContent />
    </Suspense>
  );
}
