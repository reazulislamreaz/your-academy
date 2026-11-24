'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { loadSavedExamResult } from '@/features/bookmarks/saved-exam';
import { PreliPracticeResultView } from '@/features/preli-practice/preli-practice-result-view';
import type { PreliPracticeResult } from '@/features/preli-practice/preli-practice-session';

/** Result of an exam taken from saved questions (kept in this browser tab). */
export default function SavedExamResultPage() {
  const [result, setResult] = useState<PreliPracticeResult | null | undefined>(undefined);

  useEffect(() => {
    const run = new URLSearchParams(window.location.search).get('run');
    setResult(run ? loadSavedExamResult(run) : null);
  }, []);

  if (result === undefined) {
    return (
      <div className="mx-auto flex min-h-[40vh] w-full max-w-3xl items-center justify-center px-4">
        <p className="text-sm text-[var(--muted)]" role="status">
          Loading result…
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <Alert variant="warning">
          This result is no longer available in this tab.{' '}
          <Link href="/bookmarks" className="font-semibold underline-offset-2 hover:underline">
            Back to saved items
          </Link>
        </Alert>
      </div>
    );
  }

  const folderParam = result.setId === 'all' ? '' : `?folder=${encodeURIComponent(result.setId)}`;
  return (
    <PreliPracticeResultView
      result={result}
      kindLabel="Saved questions exam"
      backHref={`/bookmarks${folderParam}`}
      backLabel="Back to saved items"
      retakeHref={`/bookmarks/exam?folder=${encodeURIComponent(result.setId)}&minutes=${result.durationMinutes}`}
    />
  );
}
