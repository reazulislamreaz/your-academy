'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { EntitlementCallout } from '@/components/access/entitlement-callout';
import { OptionRow, type OptionRowState } from '@/components/questions/option-row';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { Alert } from '@/components/ui/alert';
import { meQueryKey } from '@/features/auth/use-auth';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { MeUser, QuestionDetail } from '@/lib/api/types';

function QuestionDetailContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

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

  useEffect(() => {
    setSelectedId(null);
    setChecked(false);
  }, [params.id]);

  const persistProgress = useMutation({
    mutationFn: (body: { lastQuestionId: string; lastQuestionFilterQs: string | null }) =>
      apiFetch<MeUser>('/users/me/study-prefs', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (user) => {
      qc.setQueryData(meQueryKey, user);
    },
  });

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    void (async () => {
      try {
        const user = await apiFetch<MeUser>('/users/me/study-prefs', {
          method: 'PATCH',
          body: JSON.stringify({
            lastQuestionId: data.id,
            lastQuestionFilterQs: filterQs || null,
          }),
        });
        if (!cancelled) qc.setQueryData(meQueryKey, user);
      } catch {
        // Non-blocking: practice still works if resume pointer fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data?.id, filterQs, qc]);

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
      void qc.invalidateQueries({ queryKey: ['stats'] });
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

  const selected = data.options.find((o) => o.id === selectedId);
  /** Feedback only after Check — never leak correctness before the learner commits. */
  const showAnswerKeys = checked && data.answersVisible;

  function optionState(option: QuestionDetail['options'][number]): OptionRowState {
    const isSelected = selectedId === option.id;
    if (!showAnswerKeys) {
      return isSelected ? 'selected' : 'idle';
    }
    if (option.isCorrect === true) {
      return isSelected ? 'correct' : 'missed';
    }
    if (isSelected && option.isCorrect === false) return 'incorrect';
    return 'idle';
  }

  function navHref(id: string) {
    return `/questions/${id}${filterQs ? `?${filterQs}` : ''}`;
  }

  return (
    <article className="mx-auto max-w-3xl space-y-7 pb-40 sm:pb-32">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-[var(--muted-strong)]">
          <Link href={`/questions${filterQs ? `?${filterQs}` : ''}`} className="hover:text-[var(--highlight)]">
            Question bank
          </Link>
          <span aria-hidden>/</span>
          <span className="truncate">{data.category.name}</span>
          {data.subcategory ? (
            <>
              <span aria-hidden>/</span>
              <span className="truncate">{data.subcategory.name}</span>
            </>
          ) : null}
          <Badge variant="highlight">{data.difficulty}</Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="min-h-10 shrink-0"
          onClick={() => bookmark.mutate()}
          disabled={bookmark.isPending}
        >
          {bookmark.isPending ? 'Saving…' : data.bookmarked ? 'Remove save' : 'Save'}
        </Button>
      </div>

      <header className="motion-rise space-y-4 border-b border-[var(--line)] pb-6">
        <h1 className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-tight">
          {data.title}
        </h1>
        <p className="font-reading text-lg leading-relaxed break-words text-[var(--ink-soft)]">{data.content}</p>
      </header>

      <div className="grid gap-2.5" role="radiogroup" aria-label="Answer options">
        {data.options.map((option) => (
          <OptionRow
            key={option.id}
            label={option.label}
            content={option.content}
            state={optionState(option)}
            disabled={showAnswerKeys}
            onSelect={() => {
              if (showAnswerKeys) return;
              setSelectedId(option.id);
              setChecked(false);
            }}
          />
        ))}
      </div>

      {!checked ? (
        <EntitlementCallout
          variant="practice"
          title="Select, then check"
          description={
            data.answersVisible
              ? 'Choose an option and press Check answer to reveal the key and explanation.'
              : 'Choose an option and press Check answer. Correct keys stay hidden after your trial ends.'
          }
        />
      ) : null}

      {checked && !data.answersVisible ? (
        <EntitlementCallout
          variant="locked"
          title={`You selected ${selected?.label ?? 'an option'}`}
          description="Correct answers and explanations unlock during your trial or with a future premium plan. You can keep browsing the full question bank."
        />
      ) : null}

      {checked && data.explanation ? (
        <Surface className="motion-rise border-l-[3px] border-l-[var(--highlight)] p-5 sm:p-6">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-[var(--muted-strong)] uppercase">
            Explanation
          </h2>
          <p className="font-reading mt-3 leading-relaxed text-[var(--muted-strong)]">
            {data.explanation}
          </p>
        </Surface>
      ) : null}

      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--line)] bg-[var(--bg-elevated)]/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:left-[16rem]"
        role="navigation"
        aria-label="Practice navigation"
      >
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6">
          <div className="flex shrink-0 gap-1 sm:gap-2">
            {nav?.prevId ? (
              <Link href={navHref(nav.prevId)}>
                <Button variant="ghost" size="md" className="min-h-11 px-2.5 sm:px-4">
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
              </Link>
            ) : (
              <Button variant="ghost" size="md" className="min-h-11 px-2.5 sm:px-4" disabled>
                <ChevronLeft className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Previous</span>
              </Button>
            )}
          </div>

          <Button
            size="md"
            className="min-h-11 min-w-0 flex-1 px-3 sm:max-w-xs sm:flex-none sm:px-5"
            disabled={!selectedId || showAnswerKeys}
            onClick={() => {
              if (!selectedId || !data) return;
              setChecked(true);
              persistProgress.mutate({
                lastQuestionId: data.id,
                lastQuestionFilterQs: filterQs || null,
              });
              // Persist attempt for personal performance analytics (server computes correctness).
              void apiFetch(`/questions/${data.id}/attempts`, {
                method: 'POST',
                body: JSON.stringify({ selectedOptionId: selectedId }),
              })
                .then(() => {
                  void qc.invalidateQueries({ queryKey: ['stats'] });
                })
                .catch(() => {
                  // Non-blocking: practice UI still works if analytics write fails.
                });
            }}
          >
            <Check className="h-4 w-4" aria-hidden />
            <span className="truncate">{checked ? 'Checked' : 'Check answer'}</span>
          </Button>

          <div className="flex shrink-0 gap-1 sm:gap-2">
            {nav?.nextId ? (
              <Link href={navHref(nav.nextId)}>
                <Button variant="outline" size="md" className="min-h-11 px-2.5 sm:px-4">
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="md" className="min-h-11 px-2.5 sm:px-4" disabled>
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            )}
          </div>
        </div>
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
