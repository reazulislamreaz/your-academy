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
import { ApiError, apiFetch, apiFetchResult } from '@/lib/api/client';
import type { MeUser, QuestionDetail, QuestionListItem } from '@/lib/api/types';

function QuestionDetailContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [copied, setCopied] = useState(false);

  const filterQs = useMemo(() => {
    const sp = new URLSearchParams();
    for (const key of ['q', 'categoryId', 'subcategoryId', 'difficulty', 'kind'] as const) {
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

  const { data: related } = useQuery({
    queryKey: ['related-questions', data?.category.id, params.id],
    queryFn: async () => {
      const result = await apiFetchResult<QuestionListItem[]>(
        `/questions?categoryId=${data!.category.id}&limit=5`,
      );
      return result.data.filter((item) => item.id !== params.id).slice(0, 5);
    },
    enabled: Boolean(data),
    retry: false,
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
  const isWritten = data.kind === 'WRITTEN';
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
    <article className="mx-auto max-w-3xl space-y-7 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
          <Link href={`/questions${filterQs ? `?${filterQs}` : ''}`} className="hover:text-[var(--highlight)]">
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
          <Badge variant="highlight">{data.difficulty}</Badge>
          {data.kind === 'WRITTEN' ? <Badge variant="outline">Written</Badge> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              } catch {
                // Clipboard unavailable — the URL is already in the address bar.
              }
            }}
          >
            {copied ? 'Link copied' : 'Share'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => bookmark.mutate()}
            disabled={bookmark.isPending}
          >
            {bookmark.isPending ? 'Saving…' : data.bookmarked ? 'Remove save' : 'Save'}
          </Button>
        </div>
      </div>

      <header className="motion-rise space-y-4 border-b border-[var(--line)] pb-6">
        <h1 className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-tight">
          {data.title}
        </h1>
        <p className="font-reading text-lg leading-relaxed break-words text-[var(--ink-soft)]">{data.content}</p>
      </header>

      {isWritten ? (
        <>
          {data.modelAnswer ? (
            <Surface className="motion-rise border-l-[3px] border-l-[var(--highlight)] p-5 sm:p-6">
              <h2 className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                Model answer
              </h2>
              <p className="font-reading mt-3 leading-relaxed whitespace-pre-wrap text-[var(--muted-strong)]">
                {data.modelAnswer}
              </p>
            </Surface>
          ) : (
            <EntitlementCallout
              variant="locked"
              title="Model answer is premium"
              description="The model answer for this written question unlocks during your trial or with a future premium plan. You can keep browsing the full question bank."
            />
          )}
        </>
      ) : (
        <>
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
              <h2 className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                Explanation
              </h2>
              <p className="font-reading mt-3 leading-relaxed text-[var(--muted-strong)]">
                {data.explanation}
              </p>
            </Surface>
          ) : null}
        </>
      )}

      {related && related.length > 0 ? (
        <Surface className="p-5 sm:p-6">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
            Related questions
          </h2>
          <ul className="mt-4 divide-y divide-[var(--line)]">
            {related.map((item) => (
              <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                <Link
                  href={`/questions/${item.id}`}
                  className="text-sm font-semibold underline-offset-2 hover:underline"
                >
                  {item.title}
                </Link>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {item.category.name}
                  {item.subcategory ? ` · ${item.subcategory.name}` : ''} · {item.difficulty}
                </p>
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}

      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--line)] bg-[var(--bg-elevated)]/95 backdrop-blur-md"
        role="navigation"
        aria-label="Practice navigation"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex gap-2">
            {nav?.prevId ? (
              <Link href={navHref(nav.prevId)}>
                <Button variant="ghost" size="md">
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  Previous
                </Button>
              </Link>
            ) : (
              <Button variant="ghost" size="md" disabled>
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Previous
              </Button>
            )}
          </div>

          <Button
            size="md"
            disabled={!selectedId || showAnswerKeys || isWritten}
            onClick={() => {
              setChecked(true);
              // Record the practice attempt (fire-and-forget; practice still
              // works if it fails). The server decides whether correctness
              // may be revealed — this call never shows the result.
              if (selectedId) {
                void apiFetch(`/questions/${params.id}/attempts`, {
                  method: 'POST',
                  body: JSON.stringify({ selectedOptionId: selectedId }),
                }).catch(() => undefined);
                void qc.invalidateQueries({ queryKey: ['stats'] });
              }
              // Reinforce continue pointer on attempt (same fields; IDOR-safe via API).
              if (data) {
                persistProgress.mutate({
                  lastQuestionId: data.id,
                  lastQuestionFilterQs: filterQs || null,
                });
              }
            }}
          >
            <Check className="h-4 w-4" aria-hidden />
            {checked ? 'Checked' : 'Check answer'}
          </Button>

          <div className="flex gap-2">
            {nav?.nextId ? (
              <Link href={navHref(nav.nextId)}>
                <Button variant="outline" size="md">
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="md" disabled>
                Next
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
