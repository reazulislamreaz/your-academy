'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  questionIds: string[];
  currentIndex: number;
  answers: Record<string, string>;
  marked: Record<string, boolean>;
  onJump: (index: number) => void;
  disabled?: boolean;
  className?: string;
};

/** Numbered grid: answered / not answered / marked for review / current. */
export const ExamNavigatorGrid = memo(function ExamNavigatorGrid({
  questionIds,
  currentIndex,
  answers,
  marked,
  onJump,
  disabled,
  className,
}: Props) {
  return (
    <nav aria-label="Question navigator" className={cn('space-y-3', className)}>
      <ul
        className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-[var(--muted-strong)]"
        aria-hidden
      >
        <li className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-[4px] bg-[var(--accent)]" /> Answered
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-[4px] border border-[var(--warning)] bg-[var(--warning-soft)]" />
          Review
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-[4px] border border-[var(--line-strong)] bg-[var(--bg-elevated)]" />
          Not answered
        </li>
      </ul>

      <ol className="grid max-h-[min(22rem,48dvh)] grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1.5 overflow-y-auto overscroll-contain p-1">
        {questionIds.map((id, i) => {
          const isCurrent = i === currentIndex;
          const isAnswered = Boolean(answers[id]);
          const isMarked = Boolean(marked[id]);
          const state = [
            isAnswered ? 'answered' : 'not answered',
            isMarked ? 'marked for review' : null,
          ]
            .filter(Boolean)
            .join(', ');
          return (
            <li key={id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onJump(i)}
                aria-label={`Question ${i + 1}, ${state}`}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'relative flex h-10 w-full cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border text-sm font-semibold tabular-nums',
                  'transition-colors duration-150 motion-reduce:transition-none disabled:cursor-not-allowed',
                  isMarked
                    ? 'border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning-fg)]'
                    : isAnswered
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]'
                      : 'border-[var(--line-strong)] bg-[var(--bg-elevated)] text-[var(--muted-strong)] hover:border-[var(--accent)] hover:text-[var(--ink)]',
                  isCurrent &&
                    'ring-2 ring-[var(--highlight)] ring-offset-2 ring-offset-[var(--bg-elevated)]',
                )}
              >
                {i + 1}
                {isMarked && isAnswered ? (
                  <span
                    aria-hidden
                    className="absolute top-1 right-1 size-1.5 rounded-full bg-[var(--accent)]"
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
});
