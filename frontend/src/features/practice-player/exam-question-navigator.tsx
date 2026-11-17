'use client';

import { cn } from '@/lib/utils';

type Props = {
  total: number;
  currentIndex: number;
  answers: Record<string, string>;
  marked: Record<string, boolean>;
  questionIds: string[];
  onJump: (index: number) => void;
  compact?: boolean;
  className?: string;
};

export function ExamQuestionNavigator({
  total,
  currentIndex,
  answers,
  marked,
  questionIds,
  onJump,
  compact,
  className,
}: Props) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold tracking-tight text-[var(--ink)]">
          Navigator
        </h3>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[0.65rem] text-[var(--muted)]">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm bg-[var(--success)]" /> Answered
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm bg-[var(--warning)]" /> Review
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm bg-[var(--bg-muted)] ring-1 ring-[var(--line)]" />{' '}
            Open
          </span>
        </div>
      </div>

      <div
        className={cn(
          'grid gap-1.5 overflow-y-auto overscroll-contain pr-0.5',
          compact
            ? 'max-h-[9.5rem] grid-cols-8 sm:grid-cols-10'
            : 'max-h-[min(28rem,52vh)] grid-cols-5 sm:grid-cols-6',
        )}
      >
        {Array.from({ length: total }, (_, i) => {
          const id = questionIds[i]!;
          const isCurrent = i === currentIndex;
          const isAnswered = Boolean(answers[id]);
          const isMarked = Boolean(marked[id]);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onJump(i)}
              aria-label={`Question ${i + 1}${isAnswered ? ', answered' : ''}${isMarked ? ', marked for review' : ''}${isCurrent ? ', current' : ''}`}
              aria-current={isCurrent ? 'true' : undefined}
              className={cn(
                'flex size-8 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-[0.7rem] font-semibold tabular-nums transition-[border-color,background-color,transform] duration-150 sm:size-9 sm:text-xs',
                isCurrent &&
                  'border-2 border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-[var(--shadow-sm)]',
                !isCurrent &&
                  isMarked &&
                  'border border-[var(--warning)]/55 bg-[var(--warning-soft)] text-[var(--warning-fg)]',
                !isCurrent &&
                  !isMarked &&
                  isAnswered &&
                  'border border-[var(--success)]/45 bg-[var(--success-soft)] text-[var(--success-fg)]',
                !isCurrent &&
                  !isMarked &&
                  !isAnswered &&
                  'border border-transparent bg-[var(--bg-muted)] text-[var(--muted)] hover:bg-[var(--bg-soft)]',
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
