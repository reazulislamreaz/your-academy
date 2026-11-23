'use client';

import { memo, useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

export type ExamOptionItem = {
  /** Value sent to the API (option id or option text). */
  value: string;
  /** Badge label — A/B/C/D or ক/খ/গ/ঘ. */
  label: string;
  content: string;
};

type Props = {
  questionId: string;
  questionNumber: number;
  options: ExamOptionItem[];
  selectedValue: string | null | undefined;
  disabled?: boolean;
  onSelect: (questionId: string, value: string) => void;
};

/**
 * Large tappable single-choice options (ARIA radio group).
 * ↑/↓ move between options; ←/→ are left to the page for question navigation.
 */
export const ExamOptionList = memo(function ExamOptionList({
  questionId,
  questionNumber,
  options,
  selectedValue,
  disabled,
  onSelect,
}: Props) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = options.findIndex((o) => o.value === selectedValue);
  const tabStop = selectedIndex >= 0 ? selectedIndex : 0;

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const delta = e.key === 'ArrowDown' ? 1 : -1;
    const next = (index + delta + options.length) % options.length;
    refs.current[next]?.focus();
    const opt = options[next];
    if (opt && !disabled) onSelect(questionId, opt.value);
  };

  return (
    <div
      role="radiogroup"
      aria-label={`Options for question ${questionNumber}`}
      className="grid gap-2.5"
    >
      {options.map((opt, i) => {
        const selected = i === selectedIndex;
        return (
          <button
            key={`${questionId}-${i}`}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={i === tabStop ? 0 : -1}
            disabled={disabled}
            onClick={() => onSelect(questionId, opt.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'group flex min-h-14 w-full cursor-pointer items-start gap-3 rounded-[var(--radius)] border-2 px-3 py-3 text-left',
              'transition-[border-color,background-color,box-shadow] duration-150 motion-reduce:transition-none',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--highlight)]',
              'disabled:cursor-not-allowed disabled:opacity-60 sm:px-4',
              selected
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-[var(--shadow-sm)]'
                : 'border-[var(--line)] bg-[var(--bg-elevated)] hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--line))] hover:bg-[var(--brand-wash)]',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'type-bn-serial mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-sm transition-colors',
                selected
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'bg-[var(--bg-muted)] text-[var(--muted-strong)] group-hover:text-[var(--ink)]',
              )}
            >
              {opt.label}
            </span>
            <span className="type-mcq-option min-w-0 flex-1 pt-0.5 break-words whitespace-pre-wrap text-[var(--ink)]">
              <span className="sr-only">{opt.label}. </span>
              {opt.content}
            </span>
          </button>
        );
      })}
    </div>
  );
});
