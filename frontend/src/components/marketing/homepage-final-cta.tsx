import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { HomepagePayload } from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/reveal';

type Props = {
  ctaBanner: HomepagePayload['ctaBanner'];
};

export function HomepageFinalCta({ ctaBanner }: Props) {
  if (!ctaBanner.visible) return null;

  return (
    <section
      id="get-started"
      aria-labelledby="final-cta-heading"
      className="scroll-mt-24 pb-[var(--space-section)]"
    >
      <Reveal className="marketing-container">
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] bg-[var(--bg-inverse)] px-6 py-10 text-center text-white shadow-[var(--shadow)] sm:px-10 sm:py-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-[var(--highlight)]/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-[#3b6fd9]/25 blur-3xl"
          />
          <div className="relative mx-auto max-w-xl space-y-4">
            <h2
              id="final-cta-heading"
              className="font-display text-2xl font-bold tracking-tight sm:text-3xl"
            >
              {ctaBanner.heading}
            </h2>
            <p className="text-sm leading-relaxed text-white/75 sm:text-base">{ctaBanner.body}</p>
            <div className="flex flex-col items-stretch justify-center gap-3 pt-2 sm:flex-row sm:items-center">
              {ctaBanner.cta.visible ? (
                <Link href={ctaBanner.cta.href}>
                  <Button className="w-full rounded-full px-8 sm:w-auto">
                    {ctaBanner.cta.label}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Button>
                </Link>
              ) : null}
              <Link href="/preli-question-bank">
                <Button
                  variant="outline"
                  className="w-full rounded-full border-white/35 bg-white/5 px-8 text-white hover:bg-white/12 sm:w-auto"
                >
                  Explore Question Bank
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
