'use client';

import { Eraser, Flag } from 'lucide-react';
import { memo } from 'react';
import { cn } from '@/lib/utils';
import { ExamOptionList, type ExamOptionItem } from './exam-option-list';

type Props = {
  questionId: string;
  /** 1-based. */
  number: number;
  total: number;
  /** Optional short heading (practice-set questions have one). */
  title?: string | null;
  text: string;
  options: ExamOptionItem[];
  selectedValue: string | null | undefined;
  marked: boolean;
  disabled?: boolean;
  /** Highlights the card in "view all" mode. */
  active?: boolean;
  onSelect: (questionId: string, value: string) => void;
  onClear: (questionId: string) => void;
  onToggleMark: (questionId: string) => void;
  /** Lets "view all" mode track which question the learner is working on. */
  onFocusQuestion?: (questionId: string) => void;
  domId?: string;
};

/** One MCQ: stem, options, mark-for-review and clear. Memoized — props must be stable. */
export const ExamQuestionCard = memo(function ExamQuestionCard({
  questionId,
  number,
  total,
  title,
  text,
  options,
  selectedValue,
  marked,
  disabled,
  active,
  onSelect,
  onClear,
  onToggleMark,
  onFocusQuestion,
  domId,
}: Props) {
  const headingId = `${domId ?? questionId}-heading`;

  return (
    <section
      id={domId}
      aria-labelledby={headingId}
      onFocusCapture={onFocusQuestion ? () => onFocusQuestion(questionId) : undefined}
      className={cn(
        'scroll-mt-40 rounded-[var(--radius-xl)] border bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)] sm:p-6',
        '[&_img]:h-auto [&_img]:max-w-full',
        active
          ? 'border-[color-mix(in_srgb,var(--accent)_45%,var(--line))]'
          : 'border-[var(--line)]',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
          Question <span className="tabular-nums">{number}</span>
          <span className="font-normal text-[var(--muted)]"> of {total}</span>
        </p>
        <button
          type="button"
          onClick={() => onToggleMark(questionId)}
          disabled={disabled}
          aria-pressed={marked}
          aria-label="Mark for review"
          className={cn(
            'inline-flex min-h-9 shrink-0 whitespace-nowrap cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors',
            'disabled:cursor-not-allowed disabled:opacity-60',
            marked
              ? 'border-[var(--warning)]/55 bg-[var(--warning-soft)] text-[var(--warning-fg)]'
              : 'border-[var(--line)] text-[var(--muted-strong)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]',
          )}
        >
          <Flag className="size-3.5" aria-hidden fill={marked ? 'currentColor' : 'none'} />
          <span className="sm:hidden">{marked ? 'Marked' : 'Mark'}</span>
          <span className="hidden sm:inline">
            {marked ? 'Marked for review' : 'Mark for review'}
          </span>
        </button>
      </div>

      {title && title.trim() && title.trim() !== text.trim() ? (
        <p className="mt-3 text-sm font-semibold break-words text-[var(--muted-strong)]">{title}</p>
      ) : null}
      <h2
        id={headingId}
        className="type-prose-title mt-3 break-words whitespace-pre-wrap text-[var(--ink)] sm:mt-4"
      >
        <span className="sr-only">Question {number}. </span>
        {text}
      </h2>

      <div className="mt-4 sm:mt-5">
        <ExamOptionList
          questionId={questionId}
          questionNumber={number}
          options={options}
          selectedValue={selectedValue}
          disabled={disabled}
          onSelect={onSelect}
        />
      </div>

      <div className="mt-3 flex min-h-9 items-center justify-end">
        {selectedValue ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onClear(questionId)}
            className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-[var(--muted-strong)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Eraser className="size-3.5" aria-hidden />
            Clear answer
          </button>
        ) : null}
      </div>
    </section>
  );
});
