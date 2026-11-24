import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ModelTestPlayer } from '@/features/model-tests/model-test-player';
import { LockedContent } from '@/components/access/locked-content';
import { fetchModelTestForTaking } from '@/features/model-tests/fetch-model-test';
import { decodeRouteParam } from '@/lib/route-params';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = decodeRouteParam((await params).id);
  const result = await fetchModelTestForTaking(id);
  const modelTest = result.kind === 'ok' ? result.modelTest : null;
  return {
    title: modelTest ? modelTest.title : result.kind === 'locked' ? 'Model test' : 'Model test not found',
  };
}

/** Same ModelTestPlayer as marketing `/model-test/[id]` — stays in learner shell. */
export default async function LiveModelTestTakePage({ params }: Props) {
  const id = decodeRouteParam((await params).id);
  const result = await fetchModelTestForTaking(id);
  if (result.kind === 'not-found') notFound();
  if (result.kind === 'locked') return <LockedContent className="my-10" />;
  const modelTest = result.modelTest;
  return <ModelTestPlayer modelTest={modelTest} basePath="/live-model-tests" />;
}
