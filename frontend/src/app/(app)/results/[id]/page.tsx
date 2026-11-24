'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, List, RotateCcw } from 'lucide-react';
import { LearnerPage } from '@/components/layout/learner-page';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { AnswerReview, type ReviewItem } from '@/features/exam-ui/answer-review';
import { ResultSummary } from '@/features/exam-ui/result-summary';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { PracticeAttemptResult } from '@/lib/api/types';
import { examLabel, practiceKindLabel } from '@/lib/exam-tags';
import { ResultDetailPageSkeleton } from '@/components/skeletons';

function toReviewItems(data: PracticeAttemptResult): ReviewItem[] {
  return data.review.map((item, index) => {
    const unanswered = Boolean(item.unanswered) || !item.selectedOptionId;
    return {
      id: item.questionId,
      number: index + 1,
      title: item.title,
      text: item.content,
      options: item.options.map((opt) => ({
        key: opt.id,
        label: opt.label,
        content: opt.content,
        isCorrect: opt.isCorrect,
      })),
      selectedKey: item.selectedOptionId ?? null,
      isSkipped: unanswered,
      isCorrect: item.isCorrect,
      explanation: item.explanation,
    };
  });
}

export default function ResultDetailPage() {
  const { id } = useParams<{ id: string }>();
  const result = useQuery({
    queryKey: ['practice-attempt', id],
    queryFn: () => apiFetch<PracticeAttemptResult>(`/practice-attempts/${id}`),
    retry: false,
  });

  if (result.isLoading) {
    return <ResultDetailPageSkeleton />;
  }

  if (result.error instanceof ApiError && result.error.status === 404) {
    return (
      <EmptyState
        title="Result not found"
        description="This attempt may belong to another account."
        action={
          <Link href="/results" className="text-sm font-semibold text-[var(--highlight)]">
            Back to results
          </Link>
        }
      />
    );
  }

  if (result.isError || !result.data) {
    return <Alert variant="danger">Could not load this result.</Alert>;
  }

  const data = result.data;
  const correct = data.correctCount ?? 0;
  const wrong = data.wrongCount ?? 0;
  const total = data.totalQuestions ?? correct + wrong + (data.skippedCount ?? 0);
  const attempted = data.attempted ?? correct + wrong;
  const skipped = data.unanswered ?? data.skippedCount ?? 0;
  const percent = data.percentScore ?? 0;
  const neg = data.practiceSet.negativeMarkPerWrong;
  const submittedAt = data.submittedAt ? new Date(data.submittedAt).toLocaleString() : null;

  return (
    <LearnerPage dense>
      <ResultSummary
        eyebrow={`${practiceKindLabel(data.practiceSet.kind)} result`}
        title={data.practiceSet.title}
        meta={submittedAt ? <>Submitted {submittedAt}</> : null}
        badges={
          <>
            {data.passed != null ? (
              <Badge variant={data.passed ? 'success' : 'danger'}>
                {data.passed ? 'Passed' : 'Failed'}
                {data.practiceSet.passMarkPercent != null
                  ? ` · pass mark ${data.practiceSet.passMarkPercent}%`
                  : ''}
              </Badge>
            ) : null}
            {data.status === 'EXPIRED' ? <Badge variant="warning">Time expired</Badge> : null}
            {data.practiceSet.category ? (
              <Badge variant="outline">{data.practiceSet.category.name}</Badge>
            ) : null}
            {data.practiceSet.examTag ? (
              <Badge variant="outline">{examLabel(data.practiceSet.examTag)}</Badge>
            ) : null}
          </>
        }
        percent={percent}
        score={data.score ?? 0}
        scoreOutOf={data.maxScore ?? undefined}
        scoreCaption="Marks"
        correct={correct}
        wrong={wrong}
        skipped={skipped}
        total={total}
        timeTakenSeconds={data.elapsedSeconds}
        timeLimitSeconds={data.practiceSet.durationSeconds}
        extraStats={[
          {
            label: 'Accuracy',
            value: attempted === 0 ? '—' : `${Math.round((correct / attempted) * 1000) / 10}%`,
          },
          ...(neg > 0
            ? [{ label: 'Negative marking', value: `−${neg} / wrong`, tone: 'danger' as const }]
            : []),
        ]}
        actions={
          <>
            <Link href={`/practice/${data.practiceSet.slug}`} className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">
                <RotateCcw className="size-4" aria-hidden />
                Retake
              </Button>
            </Link>
            <Link href="/results" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                <List className="size-4" aria-hidden />
                All results
              </Button>
            </Link>
            <Link href="/home#exam-history" className="w-full sm:w-auto">
              <Button variant="ghost" className="w-full sm:w-auto">
                <BarChart3 className="size-4" aria-hidden />
                Performance dashboard
              </Button>
            </Link>
          </>
        }
      />

      <AnswerReview
        heading="Answer analysis"
        items={toReviewItems(data)}
      />
    </LearnerPage>
  );
}
