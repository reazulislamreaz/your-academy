'use client';

import { Flag, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  index: number;
  total: number;
  marked: boolean;
  disabled?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToggleMark: () => void;
  onFinish: () => void;
};

export function ExamNavControls({
  index,
  total,
  marked,
  disabled,
  onPrevious,
  onNext,
  onToggleMark,
  onFinish,
}: Props) {
  const isLast = index >= total - 1;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)]/95 p-3 shadow-[var(--shadow-sm)] backdrop-blur">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="cursor-pointer"
        disabled={disabled || index <= 0}
        onClick={onPrevious}
      >
        <ChevronLeft className="size-4" aria-hidden />
        Previous
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          'cursor-pointer',
          marked &&
            'border-[var(--warning)]/50 bg-[var(--warning-soft)] text-[var(--warning-fg)]',
        )}
        disabled={disabled}
        onClick={onToggleMark}
        aria-pressed={marked}
      >
        <Flag className="size-3.5" aria-hidden />
        {marked ? 'Marked' : 'Mark for Review'}
      </Button>

      {isLast ? (
        <div className="flex flex-col items-end gap-0.5">
          <Button
            type="button"
            size="sm"
            className="cursor-pointer"
            disabled={disabled}
            onClick={onFinish}
          >
            Finish Exam
          </Button>
          <span className="text-[0.65rem] text-[var(--muted-strong)]">
            All answers automatically saved.
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-end gap-0.5">
          <Button
            type="button"
            size="sm"
            className="cursor-pointer"
            disabled={disabled}
            onClick={onNext}
          >
            Next
            <ChevronRight className="size-4" aria-hidden />
          </Button>
          <span className="text-[0.65rem] text-[var(--muted-strong)]">
            All answers automatically saved.
          </span>
        </div>
      )}
    </div>
  );
}
