'use client';

import { useParams } from 'next/navigation';
import { PreliPracticePlayer } from '@/features/preli-practice/preli-practice-player';

/** Timed Preli Practice exam. */
export default function PreliPracticeTakePage() {
  const { batchId } = useParams<{ batchId: string }>();
  return <PreliPracticePlayer setId={batchId} basePath="/preli-practice" />;
}
