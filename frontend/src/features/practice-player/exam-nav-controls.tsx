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
  onOpenNavigator?: () => void;
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
  onOpenNavigator,
}: Props) {
  const isLast = index >= total - 1;

  return (
    <div className="flex items-center justify-between gap-1.5 sm:gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-11 cursor-pointer px-2.5 sm:px-3"
        disabled={disabled || index <= 0}
        onClick={onPrevious}
        aria-label="Previous question"
      >
        <ChevronLeft className="size-4" aria-hidden />
        <span className="hidden sm:inline">Prev</span>
      </Button>

      <div className="flex items-center gap-1.5">
        {onOpenNavigator ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 cursor-pointer px-2.5 lg:hidden"
            disabled={disabled}
            onClick={onOpenNavigator}
          >
            Grid
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'min-h-11 cursor-pointer px-2.5 sm:px-3',
            marked &&
              'border-[var(--warning)]/50 bg-[var(--warning-soft)] text-[var(--warning-fg)]',
          )}
          disabled={disabled}
          onClick={onToggleMark}
          aria-pressed={marked}
          aria-label={marked ? 'Unmark for review' : 'Mark for review'}
        >
          <Flag className="size-3.5" aria-hidden fill={marked ? 'currentColor' : 'none'} />
          <span className="hidden sm:inline">{marked ? 'Marked' : 'Mark'}</span>
        </Button>
      </div>

      {isLast ? (
        <Button
          type="button"
          size="sm"
          className="min-h-11 cursor-pointer px-3"
          disabled={disabled}
          onClick={onFinish}
        >
          Submit
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          className="min-h-11 cursor-pointer px-2.5 sm:px-3"
          disabled={disabled}
          onClick={onNext}
          aria-label="Next question"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      )}
    </div>
  );
}
