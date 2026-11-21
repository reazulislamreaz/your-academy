'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  saveGuestResultLink,
  type GuestResultLink,
} from './guest-result-link';

type Props = {
  link: Omit<GuestResultLink, 'savedAtMs'>;
  className?: string;
};

/**
 * Guest-only soft prompt under result overview — Model Test + Quiz.
 * Stores a session pointer and sends `?next=` so register returns to the result.
 */
export function GuestRegisterCta({ link, className }: Props) {
  const registerHref = `/register?next=${encodeURIComponent(link.resultPath)}`;

  return (
    <section
      className={cn(
        'rounded-[var(--radius-xl)] border p-5 sm:p-6',
        'border-[color-mix(in_srgb,var(--info)_22%,var(--line))]',
        'bg-[color-mix(in_srgb,var(--info-soft)_90%,var(--bg-elevated))]',
        'shadow-[var(--shadow-sm)]',
        className,
      )}
      aria-label="Create a free account"
    >
      <h2 className="font-display text-lg font-bold tracking-tight text-[var(--ink)] sm:text-xl">
        Save your scores on youracademy.com.bd
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted-strong)] sm:text-[0.9375rem]">
        You are browsing as a guest. Register an account to save exam scores and performance
        history across Model Tests and Quizzes.
      </p>
      <div className="mt-4">
        <Link
          href={registerHref}
          className="inline-flex w-full sm:w-auto"
          onClick={() => {
            saveGuestResultLink({
              ...link,
              savedAtMs: Date.now(),
            });
          }}
        >
          <Button
            type="button"
            variant="primary"
            className="h-11 w-full px-5 font-medium sm:h-10 sm:w-auto"
          >
            Create free account
          </Button>
        </Link>
      </div>
    </section>
  );
}
