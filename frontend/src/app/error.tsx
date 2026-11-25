'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { isChunkLoadError, reloadOnceForChunkError } from '@/lib/chunk-error-recovery';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (isChunkLoadError(error)) {
      reloadOnceForChunkError();
    }
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-bold text-[var(--ink)]">কিছু একটা সমস্যা হয়েছে</h1>
      <p className="text-sm text-[var(--muted-strong)]">
        পেজটি লোড হয়নি। সাইট আপডেটের পর কিছুক্ষণ এমন হতে পারে — আবার চেষ্টা করুন।
        <br />
        Something went wrong while loading this page. This can happen briefly after a site update —
        try again.
      </p>
      {error.digest ? (
        <p className="text-xs text-[var(--muted)]">Reference: {error.digest}</p>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={() => reset()}>
          আবার চেষ্টা করুন
        </Button>
        <Button type="button" variant="secondary" onClick={() => window.location.assign('/')}>
          হোমে যান
        </Button>
      </div>
    </div>
  );
}
