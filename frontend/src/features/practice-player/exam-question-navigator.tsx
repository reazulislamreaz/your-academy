'use client';

import { Surface } from '@/components/ui/surface';
import { cn } from '@/lib/utils';

type Props = {
  total: number;
  currentIndex: number;
  answers: Record<string, string>;
  marked: Record<string, boolean>;
  questionIds: string[];
  onJump: (index: number) => void;
  compact?: boolean;
};

export function ExamQuestionNavigator({
  total,
  currentIndex,
  answers,
  marked,
  questionIds,
  onJump,
  compact,
}: Props) {
  return (
    <Surface elevated className={cn('space-y-3 p-4', compact && 'p-3')}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold tracking-tight text-[var(--ink)]">
          Question Navigator
        </h3>
        <div className="hidden flex-wrap gap-2 text-[0.65rem] text-[var(--muted-strong)] sm:flex">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm bg-[var(--highlight)]" /> Answered
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm bg-[var(--warning)]" /> Review
          </span>
        </div>
      </div>
      <div className={cn('grid gap-2', compact ? 'grid-cols-8 sm:grid-cols-10' : 'grid-cols-5')}>
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
                'flex size-9 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-xs font-semibold transition-[border-color,background-color,transform] duration-150',
                isCurrent &&
                  'border-2 border-[var(--highlight)] bg-[color-mix(in_srgb,var(--highlight)_14%,transparent)] text-[var(--ink)]',
                !isCurrent &&
                  isMarked &&
                  'border border-[var(--warning)]/60 bg-[var(--warning-soft)] text-[var(--warning-fg)]',
                !isCurrent &&
                  !isMarked &&
                  isAnswered &&
                  'border border-[var(--highlight)]/40 bg-[color-mix(in_srgb,var(--highlight)_10%,transparent)] text-[var(--ink)]',
                !isCurrent &&
                  !isMarked &&
                  !isAnswered &&
                  'border border-transparent bg-[var(--bg-muted)] text-[var(--muted-strong)] hover:bg-[var(--bg-muted)]/80',
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </Surface>
  );
}
