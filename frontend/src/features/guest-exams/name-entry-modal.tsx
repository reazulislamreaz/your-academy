'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  examTitle: string;
  open: boolean;
  durationInMinutes: number;
  totalQuestions: number;
  onStart: (fullName: string) => void;
};

export function NameEntryModal({
  examTitle,
  open,
  durationInMinutes,
  totalQuestions,
  onStart,
}: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Focus without scrolling the underlying (already-mounted) question sheet.
  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  if (!open) return null;

  const tryStart = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (trimmed.length > 120) {
      setError('Name must be 120 characters or fewer.');
      return;
    }
    // Dismiss mobile keyboard before the sheet takes over scroll.
    inputRef.current?.blur();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onStart(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="w-full max-w-md rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-lg)] sm:p-6"
      >
        <p className="text-[0.7rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
          Before you start
        </p>
        <h2 id={`${id}-title`} className="mt-1 font-display text-xl font-bold text-[var(--ink)]">
          Enter your name
        </h2>
        <p className="mt-2 text-sm text-[var(--muted-strong)]">
          You are about to begin <span className="font-semibold text-[var(--ink)]">{examTitle}</span>
          {' '}
          ({totalQuestions} questions · {durationInMinutes} mins). Your name appears on the result
          sheet.
        </p>

        <div className="mt-5 space-y-2">
          <Label htmlFor={`${id}-name`}>Full name</Label>
          <Input
            ref={inputRef}
            id={`${id}-name`}
            value={name}
            autoComplete="name"
            maxLength={120}
            placeholder="e.g. Rahim Uddin"
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                tryStart();
              }
            }}
          />
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" onClick={tryStart}>
            Start exam
          </Button>
        </div>
      </div>
    </div>
  );
}
