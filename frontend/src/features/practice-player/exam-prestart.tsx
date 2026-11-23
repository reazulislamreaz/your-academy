'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExamIntro, introIcons } from '@/features/exam-ui/exam-intro';
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
    setHasDuration ? Math.min(set.durationSeconds!, 60 * 60) : estimated * 60,
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
  }, [timed, durationMode, setHasDuration, set.durationSeconds, presetSeconds, customSeconds]);

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

  const totalMarks = set.marksPerCorrect * set.questionCount;
  const facts = [
    { icon: introIcons.questions, label: 'Questions', value: set.questionCount },
    { icon: introIcons.timer, label: 'Total marks', value: totalMarks },
    {
      icon: introIcons.duration,
      label: 'Suggested time',
      value: setHasDuration ? formatDurationMinutes(set.durationSeconds!) : `~${estimated} min`,
    },
  ];
  const subject = set.subcategory?.name ?? set.category?.name;
  const back = backLinkFor(set.kind);
  const rules = [
    set.negativeMarkPerWrong > 0
      ? `Negative marking: −${set.negativeMarkPerWrong} for each wrong answer (${set.marksPerCorrect} per correct).`
      : `${set.marksPerCorrect} mark${set.marksPerCorrect === 1 ? '' : 's'} per correct answer, no negative marking.`,
    'Answers autosave to your account — refreshing resumes without resetting the timer.',
    timed
      ? 'Timed attempts submit automatically when the clock reaches zero.'
      : 'Untimed attempts stay open until you submit.',
    'Use 1–4 or A–D to pick an option and ←/→ to move between questions.',
    ...(set.passMarkPercent != null ? [`Pass mark: ${set.passMarkPercent}%.`] : []),
  ];

  return (
    <ExamIntro
      eyebrow={practiceKindLabel(set.kind) + (set.examTag ? ` · ${examLabel(set.examTag)}` : '')}
      title={set.title}
      description={set.description}
      tags={subject ? [subject] : []}
      facts={facts}
      rules={rules}
      askName={false}
      waiting={!canStart}
      backHref={back.href}
      backLabel={back.label}
      starting={starting}
      error={error ? 'Could not start the exam. Try again.' : null}
      onStart={start}
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">Exam mode</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTimed(true)}
              aria-pressed={timed}
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
              aria-pressed={!timed}
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
                aria-pressed={durationMode === 'default'}
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
                      aria-pressed={active}
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
    </ExamIntro>
  );
}

function backLinkFor(kind: PracticeSetDetail['kind']): { href: string; label: string } {
  if (kind === 'MODEL_TEST') return { href: '/live-model-tests', label: 'Back to model tests' };
  if (kind === 'PREVIOUS_YEAR_SET')
    return { href: '/previous-year', label: 'Back to previous years' };
  return { href: '/live-quizzes', label: 'Back to quizzes' };
}
