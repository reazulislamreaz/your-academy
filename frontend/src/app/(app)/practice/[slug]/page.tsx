'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { PracticePlayerPageSkeleton } from '@/components/skeletons';
import { ExamPlayerShell, ExamPrestart, useExamAttempt } from '@/features/practice-player';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { PracticeSetDetail } from '@/lib/api/types';

export default function PracticePlayerPage() {
  const { slug } = useParams<{ slug: string }>();

  const detail = useQuery({
    queryKey: ['practice-set', slug],
    queryFn: () => apiFetch<PracticeSetDetail>(`/practice-sets/${slug}`),
    retry: false,
  });

  if (detail.isLoading) {
    return <PracticePlayerPageSkeleton />;
  }

  if (detail.error instanceof ApiError && detail.error.status === 404) {
    return (
      <EmptyState
        title="Practice set not found"
        description="It may be unpublished or the link is incorrect."
        action={
          <Link href="/quizzes" className="text-sm font-semibold text-[var(--highlight)]">
            Back to quizzes
          </Link>
        }
      />
    );
  }

  if (detail.isError || !detail.data) {
    return <Alert variant="danger">Could not load this practice set.</Alert>;
  }

  return <PracticePlayerBody set={detail.data} slug={slug} />;
}

function PracticePlayerBody({ set, slug }: { set: PracticeSetDetail; slug: string }) {
  const attempt = useExamAttempt(set, slug);

  if (!attempt.attemptId) {
    return (
      <div className="py-2">
        <ExamPrestart
          set={set}
          starting={attempt.start.isPending}
          error={attempt.start.isError}
          onStart={(opts) => attempt.start.mutate(opts)}
        />
      </div>
    );
  }

  return <ExamPlayerShell set={set} attempt={attempt} />;
}
