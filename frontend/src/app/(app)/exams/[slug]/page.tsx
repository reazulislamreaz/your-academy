'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronRight, Clock3, FileQuestion, Trophy } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ListRow } from '@/components/ui/list-row';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { ExamAttemptStart, ExamPaperDetail } from '@/lib/api/types';

export default function ExamPaperPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [startError, setStartError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['exam-paper', params.slug],
    queryFn: () => apiFetch<ExamPaperDetail>(`/exam-papers/${params.slug}`),
    retry: false,
  });

  const start = useMutation({
    mutationFn: () => apiFetch<ExamAttemptStart>(`/exam-papers/${data!.id}/start`, { method: 'POST' }),
    onSuccess: (attempt) => {
      router.push(`/exams/attempts/${attempt.attemptId}`);
    },
    onError: (err) => {
      setStartError(err instanceof ApiError ? err.message : 'Could not start the exam');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return (
      <Alert variant="warning">
        Sign in to view this exam paper.{' '}
        <Link href="/login" className="font-semibold underline-offset-2 hover:underline">
          Sign in
        </Link>
      </Alert>
    );
  }

  if (error || !data) {
    return <Alert variant="danger">Exam paper not found.</Alert>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={data.examBody}
        title={data.title}
        description={data.description ?? undefined}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/questions">
              <Button variant="soft" size="sm">
                Practice
              </Button>
            </Link>
            <Button size="sm" disabled={start.isPending || data.questionCount === 0} onClick={() => start.mutate()}>
              {start.isPending ? 'Starting…' : 'Start exam'}
            </Button>
          </div>
        }
      />

      <div className="grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3">
        <div className="bg-[var(--bg-elevated)] p-5">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
            <FileQuestion className="h-3.5 w-3.5" aria-hidden />
            Questions
          </p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums">{data.questionCount}</p>
        </div>
        <div className="bg-[var(--bg-elevated)] p-5">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            Duration
          </p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums">
            {data.durationMinutes} min
          </p>
        </div>
        <div className="bg-[var(--bg-elevated)] p-5">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
            <Trophy className="h-3.5 w-3.5" aria-hidden />
            Total marks
          </p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums">
            {data.totalMarks ?? '—'}
          </p>
        </div>
      </div>

      {startError ? <Alert variant="danger">{startError}</Alert> : null}

      {data.questions.length === 0 ? (
        <EmptyState
          title="No questions in this paper yet"
          description="An admin is still assembling this paper. Check back soon, or practice from the question bank."
          action={
            <Link href="/questions">
              <Button size="sm">Browse questions</Button>
            </Link>
          }
        />
      ) : (
        <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {data.questions.map((item) => (
            <ListRow
              key={item.id}
              href={`/questions/${item.id}`}
              meta={
                <>
                  <span>
                    {item.category.name}
                    {item.subcategory ? ` · ${item.subcategory.name}` : ''}
                  </span>
                  <Badge variant="highlight">{item.difficulty}</Badge>
                  {item.kind === 'WRITTEN' ? <Badge variant="outline">Written</Badge> : null}
                </>
              }
              title={
                <span className="font-display text-lg font-semibold tracking-tight">
                  {item.title}
                </span>
              }
              trailing={<ChevronRight className="h-4 w-4 text-[var(--muted)]" aria-hidden />}
            />
          ))}
        </div>
      )}

      <Surface className="space-y-3 p-5 sm:p-6">
        <h2 className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
          About this paper
        </h2>
        <ul className="space-y-2 text-sm leading-relaxed text-[var(--muted-strong)]">
          <li>· This paper has {data.questionCount} question{data.questionCount === 1 ? '' : 's'}.</li>
          <li>
            · The timed exam gives you {data.durationMinutes} minutes and submits automatically
            when time runs out.
          </li>
          <li>
            · Your answers are saved as you go — you can move between questions and change an
            answer before submitting.
          </li>
          <li>
            · Your score is always visible to you. Per-question correct answers and explanations
            unlock during your trial or with a future premium plan.
          </li>
        </ul>
      </Surface>
    </div>
  );
}
