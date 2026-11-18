'use client';

import { use } from 'react';
import { WrittenQuestionSetView } from '@/features/written-question-bank/public-question-set-view';

export default function WrittenQuestionSetPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = use(params);
  return (
    <div className="mx-auto w-full max-w-[960px] px-4 py-8 sm:px-6 sm:py-10">
      <WrittenQuestionSetView setId={batchId} />
    </div>
  );
}
