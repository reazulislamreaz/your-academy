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
        <div className="hp-cta-panel px-6 py-10 text-center text-white sm:px-10 sm:py-12">
          <div className="relative z-[1] mx-auto max-w-xl space-y-4">
            <h2
              id="final-cta-heading"
              className="font-display text-2xl font-bold tracking-tight text-balance sm:text-3xl"
            >
              {ctaBanner.heading}
            </h2>
            <p className="text-sm leading-relaxed text-pretty text-white/75 sm:text-base">
              {ctaBanner.body}
            </p>
            <div className="flex flex-col items-stretch justify-center gap-3 pt-2 sm:flex-row sm:items-center">
              {ctaBanner.cta.visible ? (
                <Link href={ctaBanner.cta.href}>
                  <Button className="w-full rounded-full px-8 shadow-[0_12px_28px_-10px_rgba(227,30,36,0.55)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 sm:w-auto">
                    {ctaBanner.cta.label}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Button>
                </Link>
              ) : null}
              <Link href="/preli-question-bank">
                <Button
                  variant="outline"
                  className="w-full rounded-full border-white/40 bg-white/6 px-8 text-white backdrop-blur-sm transition-[transform,background-color,border-color] duration-200 hover:-translate-y-0.5 hover:border-white/70 hover:bg-white/12 sm:w-auto"
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
