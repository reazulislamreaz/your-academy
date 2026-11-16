'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import type { PracticeSetDetail } from '@/lib/api/types';
import { examLabel, practiceKindLabel } from '@/lib/exam-tags';
import { cn } from '@/lib/utils';
import { formatDurationMinutes, TIMER_PRESETS } from './format';
import type { StartAttemptOptions } from './use-exam-attempt';

type Props = {
  set: PracticeSetDetail;
  starting: boolean;
  error?: boolean;
  onStart: (opts: StartAttemptOptions) => void;
};

export function ExamPrestart({ set, starting, error, onStart }: Props) {
  const setHasDuration = set.durationSeconds != null && set.durationSeconds > 0;
  const [timed, setTimed] = useState(setHasDuration);
  const [presetSeconds, setPresetSeconds] = useState(30 * 60);

  return (
    <Surface elevated className="mx-auto max-w-xl space-y-5 p-5 sm:p-6">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
          {practiceKindLabel(set.kind)}
          {set.examTag ? ` · ${examLabel(set.examTag)}` : ''}
        </p>
        <h2 className="font-display text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
          {set.title}
        </h2>
        {set.description ? (
          <p className="text-sm leading-relaxed text-[var(--muted-strong)]">{set.description}</p>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-muted)]/50 px-3 py-2.5">
          <dt className="text-xs text-[var(--muted-strong)]">Questions</dt>
          <dd className="font-semibold text-[var(--ink)]">{set.questionCount}</dd>
        </div>
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-muted)]/50 px-3 py-2.5">
          <dt className="text-xs text-[var(--muted-strong)]">Subject</dt>
          <dd className="truncate font-semibold text-[var(--ink)]">
            {set.category?.name ?? set.subcategory?.name ?? 'General'}
          </dd>
        </div>
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-muted)]/50 px-3 py-2.5 col-span-2 sm:col-span-1">
          <dt className="text-xs text-[var(--muted-strong)]">Admin duration</dt>
          <dd className="font-semibold text-[var(--ink)]">
            {setHasDuration ? formatDurationMinutes(set.durationSeconds!) : 'Not set'}
          </dd>
        </div>
      </dl>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-[var(--ink)]">Exam timer</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTimed(true)}
            className={cn(
              'cursor-pointer rounded-[var(--radius)] border px-3 py-3 text-left text-sm transition-colors',
              timed
                ? 'border-[var(--highlight)] bg-[color-mix(in_srgb,var(--highlight)_10%,transparent)] font-semibold text-[var(--ink)]'
                : 'border-[var(--line)] text-[var(--muted-strong)] hover:bg-[var(--bg-muted)]',
            )}
          >
            Timed
            <span className="mt-0.5 block text-xs font-normal text-[var(--muted-strong)]">
              {setHasDuration
                ? `Use ${formatDurationMinutes(set.durationSeconds!)} limit`
                : 'Choose a duration'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTimed(false)}
            className={cn(
              'cursor-pointer rounded-[var(--radius)] border px-3 py-3 text-left text-sm transition-colors',
              !timed
                ? 'border-[var(--highlight)] bg-[color-mix(in_srgb,var(--highlight)_10%,transparent)] font-semibold text-[var(--ink)]'
                : 'border-[var(--line)] text-[var(--muted-strong)] hover:bg-[var(--bg-muted)]',
            )}
          >
            Untimed
            <span className="mt-0.5 block text-xs font-normal text-[var(--muted-strong)]">
              No countdown — submit when ready
            </span>
          </button>
        </div>

        {timed && !setHasDuration ? (
          <div className="flex flex-wrap gap-2">
            {TIMER_PRESETS.map((p) => (
              <button
                key={p.seconds}
                type="button"
                onClick={() => setPresetSeconds(p.seconds)}
                className={cn(
                  'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  presetSeconds === p.seconds
                    ? 'border-[var(--highlight)] bg-[var(--highlight)] text-white'
                    : 'border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--line-strong)]',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <p className="text-xs leading-relaxed text-[var(--muted-strong)]">
        Answers autosave as you go. You can mark questions for review and jump between them anytime.
        {timed ? ' Timed exams auto-submit when the clock reaches zero.' : ''}
      </p>

      {error ? <Alert variant="danger">Could not start the exam. Try again.</Alert> : null}

      <Button
        type="button"
        className="w-full cursor-pointer sm:w-auto"
        disabled={starting}
        loading={starting}
        onClick={() =>
          onStart({
            timed,
            durationSeconds: timed && !setHasDuration ? presetSeconds : undefined,
          })
        }
      >
        {starting ? 'Starting…' : 'Start exam'}
      </Button>
    </Surface>
  );
}
