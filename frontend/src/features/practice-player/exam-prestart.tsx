'use client';

import { useMemo, useState } from 'react';
import { Clock3, ListChecks, Sparkles } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Surface } from '@/components/ui/surface';
import type { PracticeSetDetail } from '@/lib/api/types';
import { examLabel, practiceKindLabel } from '@/lib/exam-tags';
import { cn } from '@/lib/utils';
import {
  TIMER_CUSTOM_MAX_MINUTES,
  TIMER_CUSTOM_MIN_MINUTES,
  TIMER_PRESETS,
  estimateMinutesForQuestions,
  formatDurationMinutes,
} from './format';
import type { StartAttemptOptions } from './use-exam-attempt';

type Props = {
  set: PracticeSetDetail;
  starting: boolean;
  error?: boolean;
  onStart: (opts: StartAttemptOptions) => void;
};

type DurationMode = 'default' | 'preset' | 'custom';

export function ExamPrestart({ set, starting, error, onStart }: Props) {
  const setHasDuration = set.durationSeconds != null && set.durationSeconds > 0;
  const setMinutes = setHasDuration ? Math.round(set.durationSeconds! / 60) : null;
  const estimated = estimateMinutesForQuestions(set.questionCount);

  const [timed, setTimed] = useState(true);
  const [durationMode, setDurationMode] = useState<DurationMode>(
    setHasDuration ? 'default' : 'preset',
  );
  const [presetSeconds, setPresetSeconds] = useState(
    setHasDuration
      ? Math.min(set.durationSeconds!, 60 * 60)
      : estimated * 60,
  );
  const [customMinutes, setCustomMinutes] = useState(
    String(setMinutes ?? Math.min(estimated, TIMER_CUSTOM_MAX_MINUTES)),
  );

  const maxMinutes = useMemo(() => {
    if (setMinutes != null) return Math.min(setMinutes, TIMER_CUSTOM_MAX_MINUTES);
    return TIMER_CUSTOM_MAX_MINUTES;
  }, [setMinutes]);

  const availablePresets = useMemo(
    () => TIMER_PRESETS.filter((p) => p.seconds / 60 <= maxMinutes),
    [maxMinutes],
  );

  const customSeconds = useMemo(() => {
    const n = Number(customMinutes);
    if (!Number.isFinite(n)) return null;
    const mins = Math.round(n);
    if (mins < TIMER_CUSTOM_MIN_MINUTES || mins > maxMinutes) return null;
    return mins * 60;
  }, [customMinutes, maxMinutes]);

  const selectedSeconds = useMemo(() => {
    if (!timed) return null;
    if (durationMode === 'default' && setHasDuration) return set.durationSeconds!;
    if (durationMode === 'preset') return presetSeconds;
    return customSeconds;
  }, [
    timed,
    durationMode,
    setHasDuration,
    set.durationSeconds,
    presetSeconds,
    customSeconds,
  ]);

  const canStart =
    !timed ||
    (selectedSeconds != null &&
      selectedSeconds >= TIMER_CUSTOM_MIN_MINUTES * 60 &&
      selectedSeconds <= maxMinutes * 60);

  const start = () => {
    if (!canStart) return;
    onStart({
      timed,
      durationSeconds: timed && selectedSeconds != null ? selectedSeconds : undefined,
    });
  };

  return (
    <Surface elevated className="motion-rise mx-auto max-w-2xl space-y-6 p-5 sm:p-7">
      <div className="space-y-2">
        <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
          {practiceKindLabel(set.kind)}
          {set.examTag ? ` · ${examLabel(set.examTag)}` : ''}
        </p>
        <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-[1.75rem]">
          {set.title}
        </h2>
        {set.description ? (
          <p className="text-sm leading-relaxed text-[var(--muted)]">{set.description}</p>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-muted)]/40 px-3.5 py-3">
          <dt className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <ListChecks className="size-3.5" aria-hidden />
            Questions
          </dt>
          <dd className="mt-1 font-display text-xl font-bold tabular-nums text-[var(--ink)]">
            {set.questionCount}
          </dd>
        </div>
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-muted)]/40 px-3.5 py-3">
          <dt className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <Sparkles className="size-3.5" aria-hidden />
            Subject
          </dt>
          <dd className="mt-1 truncate font-semibold text-[var(--ink)]">
            {set.category?.name ?? set.subcategory?.name ?? 'General'}
          </dd>
        </div>
        <div className="col-span-2 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-muted)]/40 px-3.5 py-3 sm:col-span-1">
          <dt className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <Clock3 className="size-3.5" aria-hidden />
            Suggested
          </dt>
          <dd className="mt-1 font-semibold text-[var(--ink)]">
            {setHasDuration
              ? formatDurationMinutes(set.durationSeconds!)
              : `~${estimated} min`}
          </dd>
        </div>
      </dl>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">Exam mode</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTimed(true)}
              className={cn(
                'cursor-pointer rounded-[var(--radius)] border px-3 py-3 text-left text-sm transition-colors',
                timed
                  ? 'border-[var(--highlight)] bg-[color-mix(in_srgb,var(--highlight)_10%,transparent)] font-semibold text-[var(--ink)]'
                  : 'border-[var(--line)] text-[var(--muted)] hover:bg-[var(--bg-muted)]',
              )}
            >
              Timed
              <span className="mt-0.5 block text-xs font-normal text-[var(--muted)]">
                Countdown + auto-submit
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTimed(false)}
              className={cn(
                'cursor-pointer rounded-[var(--radius)] border px-3 py-3 text-left text-sm transition-colors',
                !timed
                  ? 'border-[var(--highlight)] bg-[color-mix(in_srgb,var(--highlight)_10%,transparent)] font-semibold text-[var(--ink)]'
                  : 'border-[var(--line)] text-[var(--muted)] hover:bg-[var(--bg-muted)]',
              )}
            >
              Untimed
              <span className="mt-0.5 block text-xs font-normal text-[var(--muted)]">
                Submit when ready
              </span>
            </button>
          </div>
        </div>

        {timed ? (
          <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-muted)]/30 p-4">
            <p className="text-sm font-semibold text-[var(--ink)]">Duration</p>

            {setHasDuration ? (
              <button
                type="button"
                onClick={() => setDurationMode('default')}
                className={cn(
                  'flex w-full cursor-pointer items-center justify-between rounded-[var(--radius)] border px-3 py-2.5 text-left text-sm transition-colors',
                  durationMode === 'default'
                    ? 'border-[var(--success)] bg-[var(--success-soft)] font-semibold text-[var(--success-fg)]'
                    : 'border-[var(--line)] bg-[var(--bg-elevated)] text-[var(--ink-soft)] hover:border-[var(--line-strong)]',
                )}
              >
                <span>Use recommended</span>
                <span className="tabular-nums">{formatDurationMinutes(set.durationSeconds!)}</span>
              </button>
            ) : null}

            <div>
              <p className="mb-2 text-xs font-medium text-[var(--muted)]">Quick presets</p>
              <div className="flex flex-wrap gap-2">
                {availablePresets.map((p) => {
                  const active = durationMode === 'preset' && presetSeconds === p.seconds;
                  return (
                    <button
                      key={p.seconds}
                      type="button"
                      onClick={() => {
                        setDurationMode('preset');
                        setPresetSeconds(p.seconds);
                      }}
                      className={cn(
                        'min-h-9 cursor-pointer rounded-full border px-3.5 text-xs font-semibold transition-colors',
                        active
                          ? 'border-[var(--highlight)] bg-[var(--highlight)] text-[var(--highlight-fg)]'
                          : 'border-[var(--line)] bg-[var(--bg-elevated)] text-[var(--ink-soft)] hover:border-[var(--line-strong)]',
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exam-custom-minutes">Custom minutes</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="exam-custom-minutes"
                  type="number"
                  min={TIMER_CUSTOM_MIN_MINUTES}
                  max={maxMinutes}
                  step={1}
                  value={customMinutes}
                  onChange={(e) => {
                    setDurationMode('custom');
                    setCustomMinutes(e.target.value);
                  }}
                  onFocus={() => setDurationMode('custom')}
                  className={cn(
                    'max-w-[8rem]',
                    durationMode === 'custom' && 'border-[var(--highlight)]',
                  )}
                  aria-describedby="exam-custom-hint"
                />
                <span className="text-sm text-[var(--muted)]">minutes</span>
              </div>
              <p id="exam-custom-hint" className="text-xs text-[var(--muted)]">
                {TIMER_CUSTOM_MIN_MINUTES}–{maxMinutes} minutes
                {setHasDuration ? ' (cannot exceed recommended)' : ''}.
                {durationMode === 'custom' && customSeconds == null
                  ? ' Enter a valid whole number.'
                  : null}
              </p>
            </div>

            {selectedSeconds != null ? (
              <p className="text-sm text-[var(--ink-soft)]">
                You will have{' '}
                <strong className="text-[var(--ink)]">
                  {formatDurationMinutes(selectedSeconds)}
                </strong>{' '}
                once the exam starts.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="text-xs leading-relaxed text-[var(--muted)]">
        Answers autosave as you go. Mark questions for review and jump between them anytime.
        {timed ? ' Timed exams auto-submit when the clock reaches zero.' : ''} Refreshing the page
        resumes your attempt without resetting the timer.
      </p>

      {error ? <Alert variant="danger">Could not start the exam. Try again.</Alert> : null}

      <Button
        type="button"
        size="lg"
        className="w-full cursor-pointer sm:w-auto"
        disabled={starting || !canStart}
        loading={starting}
        onClick={start}
      >
        {starting ? 'Starting…' : 'Start exam'}
      </Button>
    </Surface>
  );
}
