'use client';

import { Surface } from '@/components/ui/surface';
import type { PracticeSetDetail } from '@/lib/api/types';
import { cn } from '@/lib/utils';

type Question = PracticeSetDetail['questions'][number];

type Props = {
  question: Question;
  index: number;
  total: number;
  selectedOptionId?: string;
  disabled?: boolean;
  onSelect: (optionId: string) => void;
  onClear: () => void;
};

export function ExamQuestionPanel({
  question,
  index,
  total,
  selectedOptionId,
  disabled,
  onSelect,
  onClear,
}: Props) {
  return (
    <Surface elevated className="exam-q-panel space-y-5 p-4 sm:p-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
          Question {index + 1} of {total}
        </p>
        <h2 className="font-display text-base font-semibold tracking-tight text-[var(--ink)] sm:text-lg">
          {question.title}
        </h2>
        <p className="type-prose whitespace-pre-wrap text-[var(--ink-soft)]">{question.content}</p>
      </div>

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
                'type-mcq-option flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border px-3.5 py-3 text-left transition-[border-color,background-color,box-shadow,transform] duration-150 disabled:cursor-not-allowed disabled:opacity-70',
                selected
                  ? 'border-[var(--highlight)] bg-[color-mix(in_srgb,var(--highlight)_12%,transparent)] text-[var(--ink)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--highlight)_35%,transparent)]'
                  : 'border-[var(--line)] bg-[var(--bg-muted)]/40 text-[var(--ink-soft)] hover:border-[var(--line-strong)] hover:bg-[var(--bg-muted)]',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  selected
                    ? 'bg-[var(--highlight)] text-white'
                    : 'bg-[var(--bg-elevated)] text-[var(--muted-strong)] ring-1 ring-[var(--line)]',
                )}
              >
                {opt.label}
              </span>
              <span className="pt-0.5 leading-snug">{opt.content}</span>
            </button>
          );
        })}
      </div>

      {selectedOptionId ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onClear}
          className="cursor-pointer text-xs font-medium text-[var(--muted-strong)] underline-offset-2 hover:text-[var(--highlight)] hover:underline disabled:cursor-not-allowed"
        >
          Clear answer
        </button>
      ) : null}
    </Surface>
  );
}
