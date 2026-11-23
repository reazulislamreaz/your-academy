import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ModelTestPlayer } from '@/features/model-tests/model-test-player';
import { serverApiBase } from '@/lib/api/client';
import type { PublicModelTestDetail } from '@your-academy/shared';
import { decodeRouteParam } from '@/lib/route-params';

type Props = { params: Promise<{ id: string }> };

async function fetchModelTest(idOrSlug: string): Promise<PublicModelTestDetail | null> {
  const res = await fetch(
    `${serverApiBase()}/public/model-tests/${encodeURIComponent(idOrSlug)}`,
    { cache: 'no-store' },
  );
  if (res.status === 404) return null;
  // Anything else is an outage, not a missing model test — let the error boundary offer a retry.
  if (!res.ok) throw new Error(`Model test API responded ${res.status}`);
  const json = (await res.json()) as { success?: boolean; data?: PublicModelTestDetail };
  return json.success && json.data ? json.data : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = decodeRouteParam((await params).id);
  const modelTest = await fetchModelTest(id);
  return {
    title: modelTest ? modelTest.title : 'Model test not found',
    description: modelTest?.description ?? 'Take a timed Model Test on Your Academy.',
  };
}

export default async function PublicModelTestTakePage({ params }: Props) {
  const id = decodeRouteParam((await params).id);
  const modelTest = await fetchModelTest(id);
  if (!modelTest) notFound();
  return <ModelTestPlayer modelTest={modelTest} />;
}
