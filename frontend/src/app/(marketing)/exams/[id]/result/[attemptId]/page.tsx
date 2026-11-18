import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ExamResultView } from '@/features/guest-exams/exam-result-view';
import { serverApiBase } from '@/lib/api/client';
import type { ExamAttemptResult } from '@your-academy/shared';

type Props = { params: Promise<{ id: string; attemptId: string }> };

async function fetchResult(attemptId: string): Promise<ExamAttemptResult | null> {
  try {
    const res = await fetch(
      `${serverApiBase()}/public/exams/attempts/${encodeURIComponent(attemptId)}`,
      { cache: 'no-store' },
    );
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: ExamAttemptResult };
    return json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { attemptId } = await params;
  const result = await fetchResult(attemptId);
  return {
    title: result ? `${result.exam.title} · Result` : 'Exam result',
  };
}

export default async function PublicExamResultPage({ params }: Props) {
  const { attemptId } = await params;
  const result = await fetchResult(attemptId);
  if (!result) notFound();
  return <ExamResultView result={result} />;
}
