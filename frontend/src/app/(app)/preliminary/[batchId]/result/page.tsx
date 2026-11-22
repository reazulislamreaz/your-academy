'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { PreliPracticeResultView } from '@/features/preli-practice/preli-practice-result-view';
import {
  loadPreliPracticeResult,
  type PreliPracticeResult,
} from '@/features/preli-practice/preli-practice-session';

/** Client-stored Preli Practice result (sessionStorage). */
export default function PreliminaryResultPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const [result, setResult] = useState<PreliPracticeResult | null | undefined>(undefined);

  useEffect(() => {
    setResult(loadPreliPracticeResult(batchId));
  }, [batchId]);

  if (result === undefined) {
    return (
      <div className="mx-auto flex min-h-[40vh] w-full max-w-3xl items-center justify-center px-4">
        <p className="text-sm text-[var(--muted)]">Loading result…</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <Alert variant="warning">
          No result found for this practice session.{' '}
          <Link href="/preliminary" className="font-semibold underline-offset-2 hover:underline">
            Back to Preli sets
          </Link>
        </Alert>
      </div>
    );
  }

  return <PreliPracticeResultView result={result} basePath="/preliminary" />;
}
