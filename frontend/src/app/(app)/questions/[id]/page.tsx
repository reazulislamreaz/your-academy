'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Suspense, useMemo, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { QuestionDetail } from '@/lib/api/types';
import { cn } from '@/lib/utils';

function QuestionDetailContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const filterQs = useMemo(() => {
    const sp = new URLSearchParams();
    for (const key of ['q', 'categoryId', 'subcategoryId', 'difficulty'] as const) {
      const v = searchParams.get(key);
      if (v) sp.set(key, v);
    }
    return sp.toString();
  }, [searchParams]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['question', params.id],
    queryFn: () => apiFetch<QuestionDetail>(`/questions/${params.id}`),
    retry: false,
  });

  const { data: nav } = useQuery({
    queryKey: ['question-nav', params.id, filterQs],
    queryFn: () =>
      apiFetch<{ prevId: string | null; nextId: string | null }>(
        `/questions/${params.id}/navigation${filterQs ? `?${filterQs}` : ''}`,
      ),
    enabled: Boolean(data),
  });

  const bookmark = useMutation({
    mutationFn: async () => {
      if (data?.bookmarked) {
        await apiFetch(`/bookmarks/questions/${params.id}`, { method: 'DELETE' });
        return false;
      }
      await apiFetch('/bookmarks/questions', {
        method: 'POST',
        body: JSON.stringify({ questionId: params.id }),
      });
      return true;
    },
    onSuccess: (bookmarked) => {
      qc.setQueryData<QuestionDetail>(['question', params.id], (prev) =>
        prev ? { ...prev, bookmarked } : prev,
      );
      void qc.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return (
      <Alert variant="warning">
        Sign in to view this question.{' '}
        <Link href="/login" className="font-semibold underline-offset-2 hover:underline">
          Sign in
        </Link>
      </Alert>
    );
  }

  if (error || !data) {
    return <Alert variant="danger">Unable to load question.</Alert>;
  }

  const showFeedback = revealed || data.answersVisible;
  const selected = data.options.find((o) => o.id === selectedId);

  function navHref(id: string) {
    return `/questions/${id}${filterQs ? `?${filterQs}` : ''}`;
  }

  return (
    <article className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
          <Link href={`/questions${filterQs ? `?${filterQs}` : ''}`} className="hover:text-[var(--ink)]">
            Question bank
          </Link>
          <span aria-hidden>/</span>
          <span>{data.category.name}</span>
          {data.subcategory ? (
            <>
              <span aria-hidden>/</span>
              <span>{data.subcategory.name}</span>
            </>
          ) : null}
          <Badge>{data.difficulty}</Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => bookmark.mutate()}
          disabled={bookmark.isPending}
        >
          {bookmark.isPending ? 'Saving…' : data.bookmarked ? 'Remove save' : 'Save'}
        </Button>
      </div>

      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{data.title}</h1>
      <p className="font-reading text-lg leading-relaxed text-[var(--ink-soft)]">{data.content}</p>

      <div className="grid gap-3" role="radiogroup" aria-label="Answer options">
        {data.options.map((option) => {
          const isSelected = selectedId === option.id;
          const isCorrect = option.isCorrect === true;
          const showCorrect = showFeedback && data.answersVisible && isCorrect;
          const showWrong =
            showFeedback && data.answersVisible && isSelected && option.isCorrect === false;

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => {
                setSelectedId(option.id);
                setRevealed(true);
              }}
              className={cn(
                'rounded-[var(--radius)] border px-4 py-3 text-left transition-colors',
                showCorrect && 'border-[var(--success)] bg-[var(--success-soft)]',
                showWrong && 'border-[var(--danger)] bg-[var(--danger-soft)]',
                !showCorrect &&
                  !showWrong &&
                  isSelected &&
                  'border-[var(--ink)] bg-[var(--bg-muted)]',
                !showCorrect &&
                  !showWrong &&
                  !isSelected &&
                  'border-[var(--line)] bg-[var(--bg-elevated)] hover:border-[var(--line-strong)]',
              )}
            >
              <span className="font-semibold">{option.label}.</span> {option.content}
              {showCorrect ? (
                <span className="ml-2 text-xs font-semibold text-[var(--success)]">Correct</span>
              ) : null}
              {showWrong ? (
                <span className="ml-2 text-xs font-semibold text-[var(--danger)]">Your pick</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {revealed && !data.answersVisible ? (
        <Alert variant="info">
          You selected {selected?.label ?? 'an option'}. Correct answers and explanations unlock
          during your trial or with a premium plan.
        </Alert>
      ) : null}

      {data.explanation ? (
        <Surface className="p-5">
          <h2 className="font-semibold">Explanation</h2>
          <p className="font-reading mt-2 leading-relaxed text-[var(--muted-strong)]">
            {data.explanation}
          </p>
        </Surface>
      ) : null}

      {!data.answersVisible && !revealed ? (
        <Alert variant="default">
          Choose an option to practice. Answer keys stay hidden after your trial ends.
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-3 border-t border-[var(--line)] pt-4">
        {nav?.prevId ? (
          <Link href={navHref(nav.prevId)}>
            <Button variant="ghost">Previous</Button>
          </Link>
        ) : null}
        {nav?.nextId ? (
          <Link href={navHref(nav.nextId)}>
            <Button variant="outline">Next</Button>
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export default function QuestionDetailPage() {
  return (
    <Suspense fallback={<Skeleton className="h-40 w-full" />}>
      <QuestionDetailContent />
    </Suspense>
  );
}
