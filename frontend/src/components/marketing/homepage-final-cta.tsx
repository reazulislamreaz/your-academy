import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { HomepagePayload } from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { HomepageReveal } from '@/components/marketing/homepage-gsap';

type Props = {
  ctaBanner: HomepagePayload['ctaBanner'];
};

export function HomepageFinalCta({ ctaBanner }: Props) {
  if (!ctaBanner.visible) return null;

  return (
    <section
      id="get-started"
      aria-labelledby="final-cta-heading"
      className="hp-section"
    >
      <HomepageReveal className="marketing-container">
        <div className="hp-cta-panel px-6 py-12 text-center text-white sm:px-12 sm:py-14">
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
                  <Button className="w-full rounded-full px-7 font-semibold sm:w-auto">
                    {ctaBanner.cta.label}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Button>
                </Link>
              ) : null}
              <Link href="/preli-question-bank">
                <Button
                  variant="outline"
                  className="w-full rounded-full border-white/30 bg-transparent px-7 font-semibold text-white hover:border-white/55 hover:bg-white/8 sm:w-auto"
                >
                  Explore Question Bank
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </HomepageReveal>
    </section>
  );
}
