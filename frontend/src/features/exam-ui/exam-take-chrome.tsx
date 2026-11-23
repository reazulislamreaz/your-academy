'use client';

import { ChevronLeft, ChevronRight, LayoutGrid, List, Rows3, Send } from 'lucide-react';
import { memo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ExamProgressBar } from './exam-progress-bar';

type HeaderProps = {
  eyebrow: string;
  title: string;
  /** Isolated ticking timer (or an "Untimed" badge). */
  timer: ReactNode;
  /** Small status line, e.g. "Saving…" / candidate name. */
  status?: ReactNode;
  answered: number;
  total: number;
  marked: number;
  viewAll: boolean;
  onToggleView: () => void;
  onSubmit: () => void;
  submitDisabled?: boolean;
  className?: string;
};

/** Sticky exam header: title, countdown, progress, view toggle and Submit. */
export const ExamTakeHeader = memo(function ExamTakeHeader({
  eyebrow,
  title,
  timer,
  status,
  answered,
  total,
  marked,
  viewAll,
  onToggleView,
  onSubmit,
  submitDisabled,
  className,
}: HeaderProps) {
  return (
    <header
      className={cn(
        'guest-exam-chrome sticky top-[calc(var(--header-h,4.25rem)+0.5rem)] z-20 rounded-[var(--radius-lg)] border border-[var(--line)]',
        'bg-[color-mix(in_srgb,var(--bg-elevated)_95%,transparent)] px-3 py-2.5 shadow-[var(--shadow-sm)] backdrop-blur-md sm:px-4 sm:py-3',
        className,
      )}
    >
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.65rem] font-semibold tracking-[0.12em] text-[var(--highlight)] uppercase">
            {eyebrow}
          </p>
          <h1 className="truncate font-display text-[0.95rem] leading-snug font-bold text-[var(--ink)] sm:text-lg">
            {title}
          </h1>
          {status ? (
            <div className="truncate text-xs text-[var(--muted-strong)]">{status}</div>
          ) : null}
        </div>
        {timer}
        <Button
          type="button"
          size="sm"
          className="hidden shrink-0 sm:inline-flex"
          disabled={submitDisabled}
          onClick={onSubmit}
        >
          <Send className="size-4" aria-hidden />
          Submit
        </Button>
      </div>
      <div className="mt-2 flex items-end gap-3">
        <ExamProgressBar answered={answered} total={total} marked={marked} className="flex-1" />
        <button
          type="button"
          onClick={onToggleView}
          aria-pressed={viewAll}
          className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[var(--line)] px-3 text-xs font-semibold text-[var(--muted-strong)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
        >
          {viewAll ? (
            <Rows3 className="size-3.5" aria-hidden />
          ) : (
            <List className="size-3.5" aria-hidden />
          )}
          {viewAll ? 'One at a time' : 'View all'}
        </button>
      </div>
    </header>
  );
});

type StepProps = {
  index: number;
  total: number;
  disabled?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  /** Mobile: opens the navigator bottom sheet. */
  onOpenNavigator?: () => void;
  className?: string;
};

/** Previous / (navigator) / Next — Next becomes Submit on the last question. */
export const ExamStepControls = memo(function ExamStepControls({
  index,
  total,
  disabled,
  onPrevious,
  onNext,
  onSubmit,
  onOpenNavigator,
  className,
}: StepProps) {
  const isLast = index >= total - 1;
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        type="button"
        variant="outline"
        className="flex-1 sm:flex-none"
        disabled={disabled || index <= 0}
        onClick={onPrevious}
      >
        <ChevronLeft className="size-4" aria-hidden />
        Previous
      </Button>
      {onOpenNavigator ? (
        <Button
          type="button"
          variant="ghost"
          className="shrink-0 px-3 tabular-nums"
          onClick={onOpenNavigator}
          aria-label={`Question ${index + 1} of ${total}. Open question navigator`}
        >
          <LayoutGrid className="size-4" aria-hidden />
          {index + 1}/{total}
        </Button>
      ) : (
        <span className="flex-1" aria-hidden />
      )}
      {isLast ? (
        <Button
          type="button"
          className="flex-1 sm:flex-none"
          disabled={disabled}
          onClick={onSubmit}
        >
          <Send className="size-4" aria-hidden />
          Submit
        </Button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          className="flex-1 sm:flex-none"
          disabled={disabled}
          onClick={onNext}
        >
          Next
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      )}
    </div>
  );
});

/** Sticky bottom action bar for phones/tablets. */
export function ExamMobileBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-3 mt-4 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-elevated)_95%,transparent)] px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:-mx-5 sm:px-5 lg:hidden">
      {children}
    </div>
  );
}
