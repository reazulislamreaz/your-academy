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
          'border-[var(--line)] bg-[var(--bg-elevated)] hover:border-[var(--line-strong)] hover:bg-[var(--brand-wash)]',
        state === 'selected' && 'border-[var(--ink)] bg-[var(--bg-muted)] shadow-[var(--shadow-sm)]',
        state === 'correct' && 'border-[var(--success)] bg-[var(--success-soft)]',
        state === 'incorrect' && 'border-[var(--danger)] bg-[var(--danger-soft)]',
        state === 'missed' && 'border-[var(--success)]/50 bg-[var(--success-soft)]/60',
        disabled && state === 'idle' && 'opacity-80',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-xs font-bold',
          state === 'idle' && 'bg-[var(--bg-muted)] text-[var(--muted-strong)]',
          state === 'selected' && 'bg-[var(--ink)] text-white',
          state === 'correct' && 'bg-[var(--success)] text-white',
          state === 'incorrect' && 'bg-[var(--danger)] text-white',
          state === 'missed' && 'bg-[var(--success)] text-white',
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
          <span className="mt-1 block text-xs font-semibold text-[var(--success)]">Correct answer</span>
        ) : null}
        {state === 'incorrect' ? (
          <span className="mt-1 block text-xs font-semibold text-[var(--danger)]">Your selection</span>
        ) : null}
        {state === 'missed' ? (
          <span className="mt-1 block text-xs font-semibold text-[var(--success)]">Correct answer</span>
        ) : null}
      </span>
    </button>
  );
}
