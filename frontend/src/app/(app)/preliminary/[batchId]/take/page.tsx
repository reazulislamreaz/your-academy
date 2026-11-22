'use client';

import { useParams } from 'next/navigation';
import { PreliPracticePlayer } from '@/features/preli-practice/preli-practice-player';

/** Timed Preli Practice exam — Model Test-style UI, client-side scoring. */
export default function PreliminaryTakePage() {
  const { batchId } = useParams<{ batchId: string }>();
  return <PreliPracticePlayer setId={batchId} basePath="/preliminary" />;
}
