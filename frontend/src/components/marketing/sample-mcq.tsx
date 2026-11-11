'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LightbulbGearIcon } from '@/components/marketing/homepage-icons';

const OPTIONS = [
  { key: 'A', label: 'Bangladesh Bank' },
  { key: 'B', label: 'Public Service Commission' },
  { key: 'C', label: 'Ministry of Finance' },
  { key: 'D', label: 'Election Commission' },
] as const;

const CORRECT_KEY = 'B';

/** Interactive sample MCQ from the homepage design — no account needed. */
export function SampleMcq() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-[18px] border border-[var(--line)] bg-white shadow-[var(--shadow)]">
      <div className="flex flex-col lg:flex-row">
        <div className="min-w-0 flex-1 p-6 sm:p-7">
          <p className="flex items-start gap-2.5 font-display text-lg leading-snug font-bold tracking-tight text-[var(--ink)] sm:text-xl">
            <span aria-hidden className="shrink-0 text-[var(--highlight)]">
              Q.
            </span>
            Which organization conducts the BCS examination in Bangladesh?
          </p>
          <div className="mt-5 grid gap-2.5" role="group" aria-label="Answer options">
            {OPTIONS.map((opt) => {
              const isSelected = selected === opt.key;
              const isCorrect = opt.key === CORRECT_KEY;
              const showCorrect = selected !== null && isCorrect;
              const showWrong = isSelected && !isCorrect;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSelected(opt.key)}
                  aria-pressed={isSelected}
                  className={cn(
                    'flex items-center gap-3 rounded-[12px] border px-4 py-3 text-left text-sm font-medium transition-colors duration-[var(--duration-fast)]',
                    showCorrect &&
                      'border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]',
                    showWrong && 'border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]',
                    !showCorrect &&
                      !showWrong &&
                      'border-[var(--line)] bg-white text-[var(--ink-soft)] hover:border-[var(--highlight)] hover:bg-[var(--highlight-soft)]',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                      showCorrect && 'border-[var(--success)] bg-[var(--success)] text-white',
                      showWrong && 'border-[var(--danger)] bg-[var(--danger)] text-white',
                      !showCorrect && !showWrong && 'border-[var(--line-strong)] text-[var(--muted)]',
                    )}
                  >
                    {showCorrect ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : showWrong ? (
                      <X className="h-3.5 w-3.5" />
                    ) : (
                      opt.key
                    )}
                  </span>
                  <span>
                    {opt.key}. {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
          {selected !== null ? (
            <p className="mt-4 text-sm leading-relaxed text-[var(--muted)] motion-fade-in" role="status">
              {selected === CORRECT_KEY
                ? 'Correct! The Bangladesh Public Service Commission conducts the BCS examination.'
                : 'Not quite — the correct answer is B. Public Service Commission.'}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-center justify-center gap-3 bg-[#e8eef8] px-6 py-8 text-center lg:w-[11.5rem]">
          <LightbulbGearIcon className="h-12 w-12 text-[var(--highlight)]" />
          <p className="text-sm leading-snug font-semibold text-[var(--ink)]">
            Get detailed solution with explanation
          </p>
        </div>
      </div>
    </div>
  );
}
