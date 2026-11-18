'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  examTitle: string;
  open: boolean;
  onStart: (fullName: string) => void;
};

export function NameEntryModal({ examTitle, open, onStart }: Props) {
  const id = useId();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

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
          You are about to begin <span className="font-semibold text-[var(--ink)]">{examTitle}</span>.
          Your name appears on the result sheet.
        </p>

        <div className="mt-5 space-y-2">
          <Label htmlFor={`${id}-name`}>Full name</Label>
          <Input
            id={`${id}-name`}
            value={name}
            autoFocus
            autoComplete="name"
            placeholder="e.g. Rahim Uddin"
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const trimmed = name.trim();
                if (trimmed.length < 2) {
                  setError('Please enter your full name (at least 2 characters).');
                  return;
                }
                onStart(trimmed);
              }
            }}
          />
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            onClick={() => {
              const trimmed = name.trim();
              if (trimmed.length < 2) {
                setError('Please enter your full name (at least 2 characters).');
                return;
              }
              onStart(trimmed);
            }}
          >
            Start exam
          </Button>
        </div>
      </div>
    </div>
  );
}
