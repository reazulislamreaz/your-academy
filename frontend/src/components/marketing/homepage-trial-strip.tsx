import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/reveal';

/** Honest 7-day trial promotion — matches backend trial entitlement. */
export function HomepageTrialStrip() {
  return (
    <section
      id="free-trial"
      aria-labelledby="trial-heading"
      className="scroll-mt-24 border-y border-[var(--line)] bg-[var(--highlight-soft)]"
    >
      <Reveal className="marketing-container flex flex-col items-start justify-between gap-4 py-6 sm:flex-row sm:items-center sm:py-7">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--highlight)] text-white shadow-sm">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <h2
              id="trial-heading"
              className="font-display text-lg font-bold tracking-tight text-[var(--ink)] sm:text-xl"
            >
              7-day free trial on every new account
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted-strong)]">
              Register to unlock correct answers, explanations, bookmarks, and timed practice for
              seven days from signup. After the trial, you can still browse questions — answers stay
              gated until a paid plan is available.
            </p>
          </div>
        </div>
        <Link href="/register" className="w-full shrink-0 sm:w-auto">
          <Button className="w-full rounded-full px-6 sm:w-auto">
            Start free trial
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </Link>
      </Reveal>
    </section>
  );
}
