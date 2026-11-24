import { CONTENT_LOCKED, type PublicModelTestDetail } from '@your-academy/shared';
import { sessionCookieHeader } from '@/features/guest-exams/session-cookie-header';
import { serverApiBase } from '@/lib/api/client';

export type ModelTestFetchResult =
  | { kind: 'ok'; modelTest: PublicModelTestDetail }
  | { kind: 'locked' }
  | { kind: 'not-found' };

/**
 * Server-side load for the take pages. Forwards the visitor's session so paid users can
 * open PAID tests (DEC-060); a 403 CONTENT_LOCKED becomes the lock screen, never questions.
 */
export async function fetchModelTestForTaking(idOrSlug: string): Promise<ModelTestFetchResult> {
  const res = await fetch(
    `${serverApiBase()}/public/model-tests/${encodeURIComponent(idOrSlug)}`,
    { cache: 'no-store', headers: await sessionCookieHeader() },
  );
  if (res.status === 404) return { kind: 'not-found' };
  if (res.status === 403) {
    const body = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
    if (body?.error?.code === CONTENT_LOCKED) return { kind: 'locked' };
  }
  // Anything else is an outage, not a missing model test — let the error boundary offer a retry.
  if (!res.ok) throw new Error(`Model test API responded ${res.status}`);
  const json = (await res.json()) as { success?: boolean; data?: PublicModelTestDetail };
  return json.success && json.data
    ? { kind: 'ok', modelTest: json.data }
    : { kind: 'not-found' };
}
