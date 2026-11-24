'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { EntitlementCallout } from '@/components/access/entitlement-callout';
import { OptionRow, type OptionRowState } from '@/components/questions/option-row';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/loading';
import { apiFetch } from '@/lib/api/client';
import type { QuestionDetail } from '@/lib/api/types';

type Props = {
  questionId: string;
  number: number;
  total: number;
};

/**
 * Inline practice view of one saved MCQ. Uses the same `/questions/:id` payload
 * as the detail page, so answer keys are present only when the API decided the
 * learner is entitled — this component never infers correctness itself.
 */
export function SavedQuestionPanel({ questionId, number, total }: Props) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['question', questionId],
    queryFn: () => apiFetch<QuestionDetail>(`/questions/${questionId}`),
    retry: false,
  });

  const recordAttempt = useMutation({
    mutationFn: (selectedOptionId: string) =>
      apiFetch(`/questions/${questionId}/attempts`, {
        method: 'POST',
        body: JSON.stringify({ selectedOptionId }),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['stats'] }),
  });

  if (isLoading) {
    return (
      <PanelShell kindLabel="Question" number={number} total={total}>
        <PageLoader compact label="Loading question" />
      </PanelShell>
    );
  }

  if (error || !data) {
    return (
      <PanelShell kindLabel="Question" number={number} total={total}>
        <Alert variant="warning">
          This question is no longer available. You can remove it from your saved items.
        </Alert>
      </PanelShell>
    );
  }

  const selected = data.options.find((o) => o.id === selectedId);
  // Feedback only after Check — never reveal correctness before the learner commits.
  const showAnswerKeys = checked && data.answersVisible;

  function optionState(option: QuestionDetail['options'][number]): OptionRowState {
    const isSelected = selectedId === option.id;
    if (!showAnswerKeys) return isSelected ? 'selected' : 'idle';
    if (option.isCorrect === true) return isSelected ? 'correct' : 'missed';
    if (isSelected && option.isCorrect === false) return 'incorrect';
    return 'idle';
  }

  return (
    <PanelShell
      kindLabel="Question"
      number={number}
      total={total}
      action={
        <Link
          href={`/questions/${data.id}`}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--line)] px-3 text-xs font-semibold text-[var(--muted-strong)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
        >
          <ExternalLink className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">Open page</span>
        </Link>
      }
    >
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted-strong)]">
        <Badge variant="info">{data.difficulty}</Badge>
        <span className="truncate">
          {data.category.name}
          {data.subcategory ? ` / ${data.subcategory.name}` : ''}
        </span>
      </div>

      <h2 className="type-prose-title mt-3 break-words text-[var(--ink)] sm:mt-4">{data.title}</h2>
      {data.content && data.content.trim() !== data.title.trim() ? (
        <p className="type-prose mt-2 break-words whitespace-pre-wrap text-[var(--ink-soft)]">
          {data.content}
        </p>
      ) : null}

      <div className="mt-4 grid gap-2.5 sm:mt-5" role="radiogroup" aria-label="Answer options">
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

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          disabled={!selectedId || checked}
          onClick={() => {
            if (!selectedId) return;
            setChecked(true);
            recordAttempt.mutate(selectedId);
          }}
        >
          <Check className="size-4" aria-hidden />
          {checked ? 'Checked' : 'Check answer'}
        </Button>
      </div>

      {checked && !data.answersVisible ? (
        <EntitlementCallout
          variant="locked"
          className="mt-4"
          title={`You selected ${selected?.label ?? 'an option'}`}
          description="Correct answers and explanations are available to subscribers."
        />
      ) : null}

      {checked && data.explanation ? (
        <div className="mt-4 rounded-[var(--radius)] border border-[var(--line)] border-l-[3px] border-l-[var(--info)] bg-[var(--bg-muted)] p-4 sm:p-5">
          <h3 className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
            Explanation
          </h3>
          <p className="type-prose mt-2 text-[var(--ink-soft)]">{data.explanation}</p>
        </div>
      ) : null}
    </PanelShell>
  );
}

/** Card frame shared by the question and PDF panels ("Question 3 of 12"). */
export function PanelShell({
  kindLabel,
  number,
  total,
  action,
  children,
}: {
  kindLabel: string;
  number: number;
  total: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={`${kindLabel} ${number} of ${total}`}
      className="rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)] sm:p-6 [&_img]:h-auto [&_img]:max-w-full"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
          {kindLabel} · Item <span className="tabular-nums">{number}</span>
          <span className="font-normal text-[var(--muted)]"> of {total}</span>
        </p>
        {action}
      </div>
      {children}
    </section>
  );
}
