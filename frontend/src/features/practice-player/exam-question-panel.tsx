'use client';

import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PracticeSetDetail } from '@/lib/api/types';
import { cn } from '@/lib/utils';

type Question = PracticeSetDetail['questions'][number];

type Props = {
  question: Question;
  index: number;
  total: number;
  selectedOptionId?: string;
  marked?: boolean;
  disabled?: boolean;
  onSelect: (optionId: string) => void;
  onClear: () => void;
  onToggleMark: () => void;
};

export function ExamQuestionPanel({
  question,
  index,
  total,
  selectedOptionId,
  marked,
  disabled,
  onSelect,
  onClear,
  onToggleMark,
}: Props) {
  return (
    <article className="exam-q-panel motion-rise space-y-5 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="type-latin-ui text-[0.6875rem] font-semibold text-[var(--muted)] uppercase">
            Question {index + 1} of {total}
          </p>
          {question.title ? (
            <h2 className="question-heading text-base sm:text-lg">{question.title}</h2>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant={marked ? 'soft' : 'outline'}
          className={cn(
            'min-h-10 shrink-0 cursor-pointer',
            marked &&
              'border-[var(--warning)]/40 bg-[var(--warning-soft)] text-[var(--warning-fg)] hover:bg-[var(--warning-soft)]',
          )}
          disabled={disabled}
          aria-pressed={marked}
          onClick={onToggleMark}
        >
          <Flag className="size-3.5" aria-hidden fill={marked ? 'currentColor' : 'none'} />
          {marked ? 'Marked' : 'Mark'}
        </Button>
      </div>

      <p className="question-text whitespace-pre-wrap text-[var(--ink-soft)]">{question.content}</p>

      <div
        className="grid gap-2.5"
        role="radiogroup"
        aria-label={`Options for question ${index + 1}`}
      >
        {question.options.map((opt) => {
          const selected = selectedOptionId === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onSelect(opt.id)}
              className={cn(
                'option-text motion-press flex min-h-12 cursor-pointer items-start gap-3 rounded-[var(--radius)] border px-3.5 py-3.5 text-left transition-[border-color,background-color,box-shadow,transform] duration-150 disabled:cursor-not-allowed disabled:opacity-70',
                selected
                  ? 'border-[var(--success)] bg-[var(--success-soft)] text-[var(--ink)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--success)_40%,transparent)]'
                  : 'border-[var(--line)] bg-[var(--bg-muted)]/35 text-[var(--ink-soft)] hover:border-[var(--line-strong)] hover:bg-[var(--bg-muted)]',
              )}
            >
              <span
                className={cn(
                  'option-label-latin mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-xs transition-colors',
                  selected
                    ? 'bg-[var(--success)] text-white'
                    : 'bg-[var(--bg-elevated)] text-[var(--muted)] ring-1 ring-[var(--line)]',
                )}
                lang="en"
              >
                {opt.label}
              </span>
              <span className="pt-1">{opt.content}</span>
            </button>
          );
        })}
      </div>

      {selectedOptionId ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onClear}
          className="cursor-pointer text-xs font-medium text-[var(--muted)] underline-offset-2 hover:text-[var(--highlight)] hover:underline disabled:cursor-not-allowed"
        >
          Clear selected answer
        </button>
      ) : null}
    </article>
  );
}
