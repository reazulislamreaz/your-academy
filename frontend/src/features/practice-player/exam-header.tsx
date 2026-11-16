'use client';

import { Flag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import type { PracticeSetDetail } from '@/lib/api/types';
import { examLabel, practiceKindLabel } from '@/lib/exam-tags';
import { cn } from '@/lib/utils';
import { formatTimer } from './format';

type Props = {
  set: PracticeSetDetail;
  remaining: number | null;
  timerSeconds: number | null;
  saveState: 'idle' | 'saving' | 'saved';
  onEndExam: () => void;
  endDisabled?: boolean;
};

export function ExamHeader({
  set,
  remaining,
  timerSeconds,
  saveState,
  onEndExam,
  endDisabled,
}: Props) {
  const timerUrgent = remaining != null && remaining <= 60;
  const timerWarn = remaining != null && remaining <= 300 && remaining > 60;
  const subject =
    set.subcategory?.name ?? set.category?.name ?? practiceKindLabel(set.kind);
  const durationLabel =
    timerSeconds != null ? `${Math.round(timerSeconds / 60)} Minutes` : 'Untimed';

  return (
    <Surface
      elevated
      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5"
    >
      <div className="min-w-0 space-y-1">
        <h1 className="font-display truncate text-lg font-bold tracking-tight text-[var(--ink)] sm:text-xl">
          {set.title}
        </h1>
        <p className="text-xs text-[var(--muted-strong)] sm:text-sm">
          {subject}
          {set.examTag ? ` · ${examLabel(set.examTag)}` : ''}
          {' · '}
          {set.questionCount} Questions
          {' · '}
          {durationLabel}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {saveState === 'saving' ? (
          <span className="text-xs text-[var(--muted-strong)]">Saving…</span>
        ) : null}
        {saveState === 'saved' ? (
          <span className="text-xs font-medium text-[var(--success)]">Saved</span>
        ) : null}

        {remaining != null ? (
          <Badge
            variant={timerUrgent ? 'danger' : timerWarn ? 'warning' : 'highlight'}
            className={cn(
              'min-w-[4.5rem] justify-center font-mono text-sm tabular-nums',
              timerUrgent && 'animate-pulse',
            )}
          >
            {formatTimer(remaining)}
          </Badge>
        ) : (
          <Badge variant="outline">Untimed</Badge>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer border-[var(--danger)]/40 text-[var(--danger-fg)] hover:bg-[var(--danger-soft)]"
          disabled={endDisabled}
          onClick={onEndExam}
        >
          <Flag className="size-3.5" aria-hidden />
          End Exam
        </Button>
      </div>
    </Surface>
  );
}
