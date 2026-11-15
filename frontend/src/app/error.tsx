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
      <h1 className="font-display text-2xl font-bold text-[var(--ink)]">Something went wrong</h1>
      <p className="text-sm text-[var(--muted-strong)]">
        The page failed to load. This can happen briefly after a site update — try again.
      </p>
      {error.digest ? (
        <p className="text-xs text-[var(--muted)]">Reference: {error.digest}</p>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        <Button type="button" variant="secondary" onClick={() => window.location.assign('/')}>
          Go home
        </Button>
      </div>
    </div>
  );
}
