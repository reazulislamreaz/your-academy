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
 * Guest-only soft prompt under result overview — Model Test + Quiz (DEC-045).
 * Stores a session pointer and sends `?next=` so register returns to the result.
 */
export function GuestRegisterCta({ link, className }: Props) {
  const registerHref = `/register?next=${encodeURIComponent(link.resultPath)}`;
  const exploreHref = link.kind === 'model-test' ? '/model-test' : '/exams';

  return (
    <section
      className={cn(
        'rounded-[var(--radius-xl)] border p-5 sm:p-6',
        'border-[color-mix(in_srgb,var(--accent)_28%,var(--line))]',
        'bg-[linear-gradient(145deg,color-mix(in_srgb,var(--accent-soft)_88%,var(--bg-elevated)),color-mix(in_srgb,var(--danger-soft)_35%,var(--bg-elevated)))]',
        'shadow-[var(--shadow-sm)]',
        'dark:bg-[linear-gradient(145deg,color-mix(in_srgb,var(--accent-soft)_55%,var(--bg-elevated)),color-mix(in_srgb,var(--danger-soft)_22%,var(--bg-elevated)))]',
        className,
      )}
      aria-label="Register to save your score"
    >
      <h2 className="font-display text-lg font-bold tracking-tight text-[var(--ink)] sm:text-xl">
        Save your scores permanently
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted-strong)] sm:text-[0.9375rem]">
        You finished as a guest. Create a free account to keep this score and your performance
        history for Model Tests and Quizzes on youracademy.com.bd.
      </p>
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
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
            Register Now
          </Button>
        </Link>
        <Link href={exploreHref} className="inline-flex w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full px-5 font-medium sm:h-10 sm:w-auto"
          >
            Explore More Exams
          </Button>
        </Link>
      </div>
    </section>
  );
}
