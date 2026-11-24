import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LockedContent } from '@/components/access/locked-content';
import { ModelTestResultView } from '@/features/model-tests/model-test-result-view';
import { sessionCookieHeader } from '@/features/guest-exams/session-cookie-header';
import { serverApiBase } from '@/lib/api/client';
import { CONTENT_LOCKED, type ModelTestAttemptResult } from '@your-academy/shared';

type Props = { params: Promise<{ id: string; attemptId: string }> };

/** `'locked'` = PAID test and the viewer has no access (DEC-060, HTTP 403 CONTENT_LOCKED). */
async function fetchResult(attemptId: string): Promise<ModelTestAttemptResult | 'locked' | null> {
  try {
    const res = await fetch(
      `${serverApiBase()}/public/model-tests/attempts/${encodeURIComponent(attemptId)}`,
      // Forward the session: results of PAID tests need an entitled viewer.
      { cache: 'no-store', headers: await sessionCookieHeader() },
    );
    if (res.status === 403) {
      const body = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
      return body?.error?.code === CONTENT_LOCKED ? 'locked' : null;
    }
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: ModelTestAttemptResult };
    return json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { attemptId } = await params;
  const result = await fetchResult(attemptId);
  return {
    title:
      result && result !== 'locked' ? `${result.modelTest.title} · Result` : 'Model Test result',
  };
}

export default async function LiveModelTestResultPage({ params }: Props) {
  const { attemptId } = await params;
  const result = await fetchResult(attemptId);
  if (!result) notFound();
  if (result === 'locked') return <LockedContent className="my-10" />;
  return <ModelTestResultView result={result} basePath="/live-model-tests" />;
}
