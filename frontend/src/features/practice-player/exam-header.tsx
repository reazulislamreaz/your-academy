'use client';

import { Flag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PracticeSetDetail } from '@/lib/api/types';
import { examLabel, practiceKindLabel } from '@/lib/exam-tags';
import { cn } from '@/lib/utils';
import { formatTimer } from './format';

type Props = {
  set: PracticeSetDetail;
  remaining: number | null;
  timerSeconds: number | null;
  saveState: 'idle' | 'saving' | 'saved';
  questionIndex: number;
  totalQuestions: number;
  onEndExam: () => void;
  endDisabled?: boolean;
};

export function ExamHeader({
  set,
  remaining,
  timerSeconds,
  saveState,
  questionIndex,
  totalQuestions,
  onEndExam,
  endDisabled,
}: Props) {
  const timerUrgent = remaining != null && remaining <= 60;
  const timerWarn = remaining != null && remaining <= 300 && remaining > 60;
  const subject =
    set.subcategory?.name ?? set.category?.name ?? practiceKindLabel(set.kind);
  const durationLabel =
    timerSeconds != null ? `${Math.round(timerSeconds / 60)} min` : 'Untimed';

  return (
    <header className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="tabular-nums">
            Q {questionIndex + 1}/{totalQuestions}
          </Badge>
          {saveState === 'saving' ? (
            <span className="text-xs text-[var(--muted)]">Saving…</span>
          ) : null}
          {saveState === 'saved' ? (
            <span className="text-xs font-medium text-[var(--success)]">Saved</span>
          ) : null}
        </div>
        <h1 className="font-display truncate text-base font-bold tracking-tight text-[var(--ink)] sm:text-lg">
          {set.title}
        </h1>
        <p className="truncate text-xs text-[var(--muted)] sm:text-sm">
          {subject}
          {set.examTag ? ` · ${examLabel(set.examTag)}` : ''}
          {' · '}
          {durationLabel}
        </p>
      </div>

      <div className="flex items-center gap-2 sm:shrink-0 sm:justify-end">
        {remaining != null ? (
          <div
            className={cn(
              'flex min-w-[5.5rem] flex-col items-center rounded-[var(--radius)] px-3 py-2 font-mono',
              timerUrgent
                ? 'bg-[var(--danger-soft)] text-[var(--danger-fg)]'
                : timerWarn
                  ? 'bg-[var(--warning-soft)] text-[var(--warning-fg)]'
                  : 'bg-[var(--bg-muted)] text-[var(--ink)]',
            )}
            role="timer"
            aria-live="polite"
            aria-label={`Time remaining ${formatTimer(remaining)}`}
          >
            <span className="text-[0.65rem] font-sans font-semibold tracking-wide uppercase opacity-80">
              Time left
            </span>
            <span
              className={cn(
                'text-lg font-bold tabular-nums sm:text-xl',
                timerUrgent && 'motion-safe:animate-pulse',
              )}
            >
              {formatTimer(remaining)}
            </span>
          </div>
        ) : (
          <Badge variant="outline" className="min-h-10 px-3">
            Untimed
          </Badge>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-10 cursor-pointer border-[var(--danger)]/35 text-[var(--danger-fg)] hover:bg-[var(--danger-soft)]"
          disabled={endDisabled}
          onClick={onEndExam}
        >
          <Flag className="size-3.5" aria-hidden />
          <span className="hidden min-[380px]:inline">Submit</span>
        </Button>
      </div>
    </header>
  );
}
