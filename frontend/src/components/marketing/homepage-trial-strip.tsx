import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { createDefaultExtendedSections, type HomepagePayload } from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/reveal';

type Props = {
  content?: HomepagePayload['trialStrip'];
};

/** Honest 7-day trial promotion — matches backend trial entitlement. */
export function HomepageTrialStrip({ content }: Props) {
  const data = content ?? createDefaultExtendedSections().trialStrip;
  return (
    <section
      id="free-trial"
      aria-labelledby="trial-heading"
      className="hp-trial scroll-mt-24"
    >
      <Reveal className="marketing-container relative z-[1] flex flex-col items-start justify-between gap-4 py-6 sm:flex-row sm:items-center sm:py-8">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--highlight)] text-white shadow-[0_10px_24px_-8px_rgba(227,30,36,0.55)]">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1.5">
            <h2
              id="trial-heading"
              className="hp-heading text-lg sm:text-xl"
            >
              {data.heading}
            </h2>
            <p className="hp-lede max-w-2xl text-sm">
              {data.body}
            </p>
          </div>
        </div>
        {data.cta.visible ? (
          <Link href={data.cta.href} className="w-full shrink-0 sm:w-auto">
            <Button className="min-h-11 w-full rounded-full px-6 shadow-[0_10px_24px_-10px_rgba(227,30,36,0.55)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 sm:w-auto">
              {data.cta.label}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        ) : null}
      </Reveal>
    </section>
  );
}
