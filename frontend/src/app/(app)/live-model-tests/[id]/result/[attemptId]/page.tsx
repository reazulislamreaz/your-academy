import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ModelTestResultView } from '@/features/model-tests/model-test-result-view';
import { sessionCookieHeader } from '@/features/guest-exams/session-cookie-header';
import { serverApiBase } from '@/lib/api/client';
import type { ModelTestAttemptResult } from '@your-academy/shared';

type Props = { params: Promise<{ id: string; attemptId: string }> };

async function fetchResult(attemptId: string): Promise<ModelTestAttemptResult | null> {
  try {
    const res = await fetch(
      `${serverApiBase()}/public/model-tests/attempts/${encodeURIComponent(attemptId)}`,
      // DEC-051: forward the session so entitled viewers get the answer key.
      { cache: 'no-store', headers: await sessionCookieHeader() },
    );
    if (res.status === 404) return null;
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
    title: result ? `${result.modelTest.title} · Result` : 'Model Test result',
  };
}

export default async function LiveModelTestResultPage({ params }: Props) {
  const { attemptId } = await params;
  const result = await fetchResult(attemptId);
  if (!result) notFound();
  return <ModelTestResultView result={result} basePath="/live-model-tests" />;
}
