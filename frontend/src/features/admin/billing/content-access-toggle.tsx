'use client';

import { Lock, LockOpen } from 'lucide-react';
import type { ContentAccessLevel } from '@your-academy/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/** DEC-060 — single Free / Paid switch for Model Tests (keyboard-operable radio group). */
export function ContentAccessToggle({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  value: ContentAccessLevel;
  onChange: (next: ContentAccessLevel) => void;
  disabled?: boolean;
}) {
  const options: Array<{ value: ContentAccessLevel; label: string; icon: typeof Lock }> = [
    { value: 'FREE', label: 'Free', icon: LockOpen },
    { value: 'PAID', label: 'Paid', icon: Lock },
  ];
  return (
    <div
      id={id}
      role="radiogroup"
      aria-label="Free or paid"
      className="inline-flex h-10 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-0.5"
    >
      {options.map((o) => {
        const active = value === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[calc(var(--radius)-2px)] px-3 text-sm font-medium transition-colors disabled:opacity-60',
              active
                ? o.value === 'PAID'
                  ? 'bg-[var(--warning-soft)] text-[var(--warning-fg)]'
                  : 'bg-[var(--success-soft)] text-[var(--success-fg)]'
                : 'text-[var(--muted-strong)] hover:text-[var(--ink)]',
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function ContentAccessBadge({ access }: { access: ContentAccessLevel }) {
  return access === 'PAID' ? (
    <Badge variant="warning">Paid</Badge>
  ) : (
    <Badge variant="success">Free</Badge>
  );
}
