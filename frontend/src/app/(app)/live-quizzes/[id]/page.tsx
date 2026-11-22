import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GuestExamPlayer } from '@/features/guest-exams/exam-player';
import { serverApiBase } from '@/lib/api/client';
import type { PublicExamDetail } from '@your-academy/shared';

type Props = { params: Promise<{ id: string }> };

async function fetchExam(idOrSlug: string): Promise<PublicExamDetail | null> {
  try {
    const res = await fetch(`${serverApiBase()}/public/exams/${encodeURIComponent(idOrSlug)}`, {
      cache: 'no-store',
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: PublicExamDetail };
    return json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const exam = await fetchExam(id);
  return {
    title: exam ? exam.title : 'Quiz',
  };
}

/** Same GuestExamPlayer as marketing `/exams/[id]` — stays in learner shell. */
export default async function LiveQuizTakePage({ params }: Props) {
  const { id } = await params;
  const exam = await fetchExam(id);
  if (!exam) notFound();
  return <GuestExamPlayer exam={exam} basePath="/live-quizzes" />;
}
