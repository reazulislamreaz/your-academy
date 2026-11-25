import { ApiError } from '@/lib/api/client';
import { LoadError } from './load-error';

/**
 * ERR-7 — a set page that failed to load. Only a real 404 says "not found"; a rate limit,
 * network error or outage shows what happened (server text is already readable) with a retry.
 */
export function SetLoadError({
  error,
  notFoundMessage,
  onRetry,
}: {
  error: unknown;
  notFoundMessage: string;
  onRetry: () => void;
}) {
  if (error instanceof ApiError && error.status === 404) {
    return <LoadError message={notFoundMessage} />;
  }
  const message =
    error instanceof ApiError && error.status > 0 && error.status < 500
      ? error.message
      : 'লোড করা যায়নি। সংযোগ দেখে আবার চেষ্টা করুন। (Could not load — check your connection and try again.)';
  return <LoadError message={message} onRetry={onRetry} retryLabel="আবার চেষ্টা করুন" />;
}
