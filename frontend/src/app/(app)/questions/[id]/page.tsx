'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { EntitlementCallout } from '@/components/access/entitlement-callout';
import { OptionRow, type OptionRowState } from '@/components/questions/option-row';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { Alert } from '@/components/ui/alert';
import { SaveToCollectionDialog } from '@/features/bookmarks/save-to-collection-dialog';
import { meQueryKey } from '@/features/auth/use-auth';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { MeUser, QuestionDetail } from '@/lib/api/types';
import { QuestionDetailPageSkeleton } from '@/components/skeletons';

function QuestionDetailContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const filterQs = useMemo(() => {
    const sp = new URLSearchParams();
    for (const key of ['q', 'categoryId', 'subcategoryId', 'difficulty', 'examTag'] as const) {
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

  // Resume pointer is written on Check (persistProgress) — avoid duplicate PATCH on every open.

  if (isLoading) {
    return <QuestionDetailPageSkeleton />;
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
    <article className="learner-page-pad-sticky mx-auto max-w-3xl space-y-5 sm:space-y-7">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-[var(--muted)] sm:text-sm">
            <Link
              href={`/questions${filterQs ? `?${filterQs}` : ''}`}
              className="font-medium text-[var(--muted-strong)] hover:text-[var(--highlight)]"
            >
              Bank
            </Link>
            <span aria-hidden className="text-[var(--line-strong)]">
              /
            </span>
            <span className="truncate">{data.category.name}</span>
            {data.subcategory ? (
              <>
                <span aria-hidden className="text-[var(--line-strong)]">
                  /
                </span>
                <span className="truncate">{data.subcategory.name}</span>
              </>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="info">{data.difficulty}</Badge>
            {data.bookmarked ? <Badge variant="bookmark">Saved</Badge> : null}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className={
            data.bookmarked
              ? 'min-h-10 shrink-0 gap-1.5 border-[var(--bookmark)]/40 text-[var(--bookmark-fg)] hover:border-[var(--bookmark)] hover:bg-[var(--bookmark-soft)]'
              : 'min-h-10 shrink-0 gap-1.5'
          }
          onClick={() => setSaveOpen(true)}
          aria-label={data.bookmarked ? 'Manage saved MCQ' : 'Save MCQ'}
        >
          <Bookmark
            className="size-4"
            aria-hidden
            fill={data.bookmarked ? 'currentColor' : 'none'}
          />
          <span className="hidden sm:inline">{data.bookmarked ? 'Saved' : 'Save'}</span>
        </Button>
      </div>

      <SaveToCollectionDialog
        open={saveOpen}
        questionId={data.id}
        questionTitle={data.title}
        onClose={() => setSaveOpen(false)}
      />

      <header className="motion-rise space-y-4 border-b border-[var(--line)] pb-6">
        <h1 className="question-heading text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold">
          {data.title}
        </h1>
        <p className="question-text break-words text-[var(--ink-soft)]">{data.content}</p>
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
              : 'Choose an option and press Check answer. Correct keys stay hidden unless you are entitled.'
          }
        />
      ) : null}

      {checked && !data.answersVisible ? (
        <EntitlementCallout
          variant="locked"
          title={`You selected ${selected?.label ?? 'an option'}`}
          description="Correct answers and explanations unlock with a future premium plan. You can keep browsing the full question bank."
        />
      ) : null}

      {checked && data.explanation ? (
        <Surface elevated className="motion-rise border-l-[3px] border-l-[var(--info)] p-5 sm:p-6">
          <h2 className="type-latin-ui text-xs font-semibold text-[var(--muted)] uppercase">
            Explanation
          </h2>
          <p className="explanation-text mt-3 text-[var(--ink-soft)]">{data.explanation}</p>
        </Surface>
      ) : null}

      <div className="learner-sticky-chrome" role="navigation" aria-label="Practice navigation">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
          {nav?.prevId ? (
            <Link href={navHref(nav.prevId)}>
              <Button variant="ghost" size="md" className="min-h-11 px-2.5 sm:px-4" aria-label="Previous">
                <ChevronLeft className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Previous</span>
              </Button>
            </Link>
          ) : (
            <Button variant="ghost" size="md" className="min-h-11 px-2.5 sm:px-4" disabled aria-label="Previous">
              <ChevronLeft className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Previous</span>
            </Button>
          )}

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
              void apiFetch(`/questions/${data.id}/attempts`, {
                method: 'POST',
                body: JSON.stringify({ selectedOptionId: selectedId }),
              })
                .then(() => {
                  void qc.invalidateQueries({ queryKey: ['stats'] });
                })
                .catch(() => {
                  /* Non-blocking analytics write */
                });
            }}
          >
            <Check className="h-4 w-4" aria-hidden />
            <span className="truncate">{checked ? 'Checked' : 'Check answer'}</span>
          </Button>

          {nav?.nextId ? (
            <Link href={navHref(nav.nextId)}>
              <Button variant="outline" size="md" className="min-h-11 px-2.5 sm:px-4" aria-label="Next">
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
          ) : (
            <Button variant="outline" size="md" className="min-h-11 px-2.5 sm:px-4" disabled aria-label="Next">
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function QuestionDetailPage() {
  return (
    <Suspense fallback={<QuestionDetailPageSkeleton />}>
      <QuestionDetailContent />
    </Suspense>
  );
}
