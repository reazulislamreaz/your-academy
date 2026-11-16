'use client';

import { cn } from '@/lib/utils';

function scorePassword(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: '' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Za-z]/.test(password) && /\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score, label: labels[score] ?? '' };
}

const TONES = [
  'bg-[var(--line)]',
  'bg-[var(--danger)]',
  'bg-[var(--warning)]',
  'bg-[var(--info)]',
  'bg-[var(--success)]',
] as const;

export function PasswordStrength({ password }: { password: string }) {
  const { score, label } = scorePassword(password);
  if (!password) return null;

  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex gap-1.5">
        {Array.from({ length: 4 }, (_, i) => (
          <span
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-[var(--duration-fast)]',
              i < score ? TONES[score] : TONES[0],
            )}
          />
        ))}
      </div>
      <p className="text-xs text-[var(--muted-strong)]">
        Strength: <span className="font-medium text-[var(--ink-soft)]">{label}</span>
        {score < 3 ? ' — use letters and numbers (8+ characters).' : null}
      </p>
    </div>
  );
}
