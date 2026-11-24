'use client';

import { useEffect, useMemo, useState } from 'react';
import { FormDialog } from '@/components/ui/form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const PRESETS = [15, 30, 45, 60] as const;
const MIN_MINUTES = 1;
const MAX_MINUTES = 180;

type Props = {
  open: boolean;
  setTitle: string;
  questionCount: number;
  pending?: boolean;
  /** Dialog heading (default "Start Preli Practice"). */
  title?: string;
  onStart: (durationMinutes: number) => void;
  onClose: () => void;
};

/** Time gate before a logged-in Preli Practice exam (no name entry). */
export function PreliPracticeStartModal({
  open,
  setTitle,
  questionCount,
  pending = false,
  title = 'Start Preli Practice',
  onStart,
  onClose,
}: Props) {
  const [preset, setPreset] = useState<(typeof PRESETS)[number] | 'custom'>(30);
  const [customMinutes, setCustomMinutes] = useState('30');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPreset(30);
    setCustomMinutes('30');
    setError(null);
  }, [open, setTitle]);

  const durationMinutes = useMemo(() => {
    if (preset !== 'custom') return preset;
    const n = Number.parseInt(customMinutes.trim(), 10);
    return Number.isFinite(n) ? n : NaN;
  }, [customMinutes, preset]);

  const invalid =
    !Number.isFinite(durationMinutes) ||
    durationMinutes < MIN_MINUTES ||
    durationMinutes > MAX_MINUTES;

  return (
    <FormDialog
      open={open}
      title={title}
      description={setTitle}
      confirmLabel={pending ? 'Starting…' : 'Start Exam'}
      cancelLabel="Cancel"
      pending={pending}
      error={error}
      disableSubmit={invalid || questionCount < 1}
      onClose={onClose}
      onSubmit={() => {
        if (questionCount < 1) {
          setError('This set has no questions yet.');
          return;
        }
        if (invalid) {
          setError(`Enter a time between ${MIN_MINUTES} and ${MAX_MINUTES} minutes.`);
          return;
        }
        setError(null);
        onStart(durationMinutes);
      }}
    >
      <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-muted)]/60 px-3.5 py-3">
        <p className="text-sm font-semibold text-[var(--ink)]">
          Total MCQs:{' '}
          <span className="tabular-nums text-[var(--accent)]">{questionCount}</span>
        </p>
      </div>

      <div className="space-y-2">
        <Label>Exam time (minutes)</Label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((m) => {
            const selected = preset === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setPreset(m);
                  setCustomMinutes(String(m));
                  setError(null);
                }}
                className={cn(
                  'inline-flex h-10 min-w-[3.25rem] items-center justify-center rounded-[var(--radius)] border px-3 text-sm font-semibold tabular-nums transition-colors',
                  selected
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--line)] bg-[var(--bg)] text-[var(--ink-soft)] hover:border-[var(--line-strong)]',
                )}
              >
                {m}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setPreset('custom')}
            className={cn(
              'inline-flex h-10 items-center justify-center rounded-[var(--radius)] border px-3 text-sm font-semibold transition-colors',
              preset === 'custom'
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'border-[var(--line)] bg-[var(--bg)] text-[var(--ink-soft)] hover:border-[var(--line-strong)]',
            )}
          >
            Custom
          </button>
        </div>
        {preset === 'custom' ? (
          <div className="pt-1">
            <Label htmlFor="preli-practice-minutes" className="sr-only">
              Custom minutes
            </Label>
            <Input
              id="preli-practice-minutes"
              type="number"
              inputMode="numeric"
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              value={customMinutes}
              onChange={(e) => {
                setCustomMinutes(e.target.value);
                setError(null);
              }}
              placeholder={`e.g. 25 (${MIN_MINUTES}–${MAX_MINUTES})`}
            />
          </div>
        ) : null}
        <p className="text-xs text-[var(--muted)]">
          Minimum {MIN_MINUTES} minute · maximum {MAX_MINUTES} minutes.
        </p>
      </div>

      <div className="space-y-2 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg)] px-3.5 py-3 text-sm leading-relaxed text-[var(--muted-strong)]">
        <p className="font-semibold text-[var(--ink)]">Before you start</p>
        <ul className="list-disc space-y-1.5 pl-4">
          <li>
            This set has{' '}
            <strong className="tabular-nums text-[var(--ink)]">{questionCount}</strong> question
            {questionCount === 1 ? '' : 's'}.
          </li>
          <li>Choose a time that suits your practice pace.</li>
          <li>The timer starts as soon as you click Start Exam.</li>
          <li>The exam is submitted automatically when time runs out.</li>
          <li>You can review unanswered questions before submitting.</li>
        </ul>
      </div>
    </FormDialog>
  );
}
