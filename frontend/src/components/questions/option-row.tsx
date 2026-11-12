'use client';

import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type OptionRowState = 'idle' | 'selected' | 'correct' | 'incorrect' | 'missed';

type Props = {
  label: string;
  content: string;
  state: OptionRowState;
  disabled?: boolean;
  onSelect: () => void;
};

/**
 * MCQ option — learning-status colors (DEC-027):
 * idle = neutral, selected = accent blue, correct = soft green, incorrect = soft red.
 */
export function OptionRow({ label, content, state, disabled, onSelect }: Props) {
  const showCorrect = state === 'correct' || state === 'missed';
  const showWrong = state === 'incorrect';

  return (
    <button
      type="button"
      role="radio"
      aria-checked={state === 'selected' || state === 'incorrect' || state === 'correct'}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'motion-press group flex w-full items-start gap-3 rounded-[var(--radius)] border px-4 py-3.5 text-left transition-[border-color,background-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
        state === 'idle' &&
          'border-[var(--line)] bg-[var(--bg-elevated)] hover:border-[var(--line-strong)] hover:bg-[var(--bg-muted)]',
        state === 'selected' &&
          'border-[var(--learn-selected)] bg-[var(--learn-selected-soft)] shadow-[var(--shadow-sm)]',
        state === 'correct' && 'border-[var(--learn-correct)] bg-[var(--learn-correct-soft)]',
        state === 'incorrect' && 'border-[var(--learn-incorrect)] bg-[var(--learn-incorrect-soft)]',
        state === 'missed' && 'border-[var(--learn-correct)]/55 bg-[var(--learn-correct-soft)]/70',
        disabled && state === 'idle' && 'opacity-80',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-xs font-bold',
          state === 'idle' && 'bg-[var(--bg-muted)] text-[var(--muted-strong)]',
          state === 'selected' && 'bg-[var(--learn-selected)] text-white',
          state === 'correct' && 'bg-[var(--learn-correct)] text-[#06281c]',
          state === 'incorrect' && 'bg-[var(--learn-incorrect)] text-white',
          state === 'missed' && 'bg-[var(--learn-correct)] text-[#06281c]',
        )}
        aria-hidden
      >
        {showCorrect ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : null}
        {showWrong ? <X className="h-3.5 w-3.5" strokeWidth={2.5} /> : null}
        {!showCorrect && !showWrong ? label : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="sr-only">{label}. </span>
        <span className="leading-relaxed text-[var(--ink-soft)]">{content}</span>
        {state === 'correct' ? (
          <span className="mt-1 block text-xs font-semibold text-[var(--success-fg)]">
            Correct answer
          </span>
        ) : null}
        {state === 'incorrect' ? (
          <span className="mt-1 block text-xs font-semibold text-[var(--danger-fg)]">
            Your selection
          </span>
        ) : null}
        {state === 'missed' ? (
          <span className="mt-1 block text-xs font-semibold text-[var(--success-fg)]">
            Correct answer
          </span>
        ) : null}
      </span>
    </button>
  );
}
