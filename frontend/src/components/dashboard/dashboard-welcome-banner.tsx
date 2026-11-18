'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  displayName: string;
  progressLine: string;
  primaryHref: string;
  primaryLabel: string;
  className?: string;
};

/** Personalized Orbit welcome hero for the learner study desk. */
export function DashboardWelcomeBanner({
  displayName,
  progressLine,
  primaryHref,
  primaryLabel,
  className,
}: Props) {
  const first = displayName.split(/\s+/)[0] || displayName;

  return (
    <section
      className={cn(
        'dashboard-welcome relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line)] p-4 sm:p-6 lg:p-7',
        className,
      )}
    >
      <div aria-hidden className="dashboard-welcome-glow pointer-events-none absolute inset-0" />
      <div className="relative z-[1] flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0 max-w-2xl space-y-2">
          <p className="inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
            <Sparkles className="size-3.5 text-[var(--accent)]" aria-hidden strokeWidth={1.75} />
            Study desk
          </p>
          <h1 className="font-display text-[clamp(1.55rem,4.8vw,2.25rem)] font-bold tracking-[-0.02em] text-[var(--ink)]">
            স্বাগতম, {first}!
          </h1>
          <p className="text-sm leading-relaxed text-[var(--muted-strong)] sm:text-[0.9375rem]">
            Welcome back — ready to level up your prep?
          </p>
          <p className="text-sm leading-relaxed text-[var(--muted)]">{progressLine}</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0">
          <Link href={primaryHref} className="min-w-0">
            <Button className="motion-press h-11 w-full px-3 sm:h-10 sm:w-auto sm:px-5">
              {primaryLabel}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </Link>
          <Link href="/exams" className="min-w-0">
            <Button variant="outline" className="motion-press h-11 w-full px-3 sm:h-10 sm:w-auto sm:px-5">
              Live exams
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
