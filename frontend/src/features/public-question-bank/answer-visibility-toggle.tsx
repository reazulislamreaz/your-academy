'use client';

import { Eye, EyeOff } from 'lucide-react';
import type { AnswerVisibilityMode } from './use-answer-visibility';
import { cn } from '@/lib/utils';

type Props = {
  mode: AnswerVisibilityMode;
  onChange: (mode: AnswerVisibilityMode) => void;
  className?: string;
};

export function AnswerVisibilityToggle({ mode, onChange, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-full border border-[var(--line)] bg-white p-1 shadow-[var(--shadow-sm)]',
        className,
      )}
      role="group"
      aria-label="Answer visibility"
    >
      <button
        type="button"
        onClick={() => onChange('show-all')}
        aria-pressed={mode === 'show-all'}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors',
          mode === 'show-all'
            ? 'bg-[var(--success-soft)] text-[var(--success)]'
            : 'text-[var(--muted-strong)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]',
        )}
      >
        <Eye className="size-4" aria-hidden />
        Show All Answers
      </button>
      <button
        type="button"
        onClick={() => onChange('hide-all')}
        aria-pressed={mode === 'hide-all'}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors',
          mode === 'hide-all'
            ? 'bg-[var(--bg-muted)] text-[var(--ink)]'
            : 'text-[var(--muted-strong)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]',
        )}
      >
        <EyeOff className="size-4" aria-hidden />
        Hide All Answers
      </button>
    </div>
  );
}
