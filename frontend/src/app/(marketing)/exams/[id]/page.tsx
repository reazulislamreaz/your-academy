import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GuestExamPlayer } from '@/features/guest-exams/exam-player';
import { serverApiBase } from '@/lib/api/client';
import { visitorIpHeader } from '@/lib/api/visitor-ip';
import type { PublicExamDetail } from '@your-academy/shared';
import { decodeRouteParam } from '@/lib/route-params';

type Props = { params: Promise<{ id: string }> };

async function fetchExam(idOrSlug: string): Promise<PublicExamDetail | null> {
  const res = await fetch(`${serverApiBase()}/public/exams/${encodeURIComponent(idOrSlug)}`, {
    cache: 'no-store',
    headers: await visitorIpHeader(),
  });
  if (res.status === 404) return null;
  // Anything else is an outage, not a missing quiz — let the error boundary offer a retry.
  if (!res.ok) throw new Error(`Quiz API responded ${res.status}`);
  const json = (await res.json()) as { success?: boolean; data?: PublicExamDetail };
  return json.success && json.data ? json.data : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = decodeRouteParam((await params).id);
  const exam = await fetchExam(id);
  return {
    title: exam ? exam.title : 'Quiz not found',
    description: exam?.description ?? 'Take a timed exam on Your Academy.',
  };
}

export default async function PublicExamTakePage({ params }: Props) {
  const id = decodeRouteParam((await params).id);
  const exam = await fetchExam(id);
  if (!exam) notFound();
  return <GuestExamPlayer exam={exam} />;
}
