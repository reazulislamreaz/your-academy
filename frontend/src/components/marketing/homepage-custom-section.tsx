import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { HomepagePayload } from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { HomepageReveal } from '@/components/marketing/homepage-gsap';
import { cn } from '@/lib/utils';

type Props = {
  section: HomepagePayload['customSections'][number];
};

/** Admin-created freeform content block. */
export function HomepageCustomSection({ section }: Props) {
  if (!section.visible) return null;

  const isBand = section.layout === 'band';
  const eyebrow = section.eyebrow?.trim();

  return (
    <section className={cn('hp-section', isBand && 'hp-section-tone')}>
      <HomepageReveal
        className={cn(
          'marketing-container space-y-4',
          isBand ? 'max-w-4xl' : 'max-w-3xl',
        )}
      >
        {isBand ? (
          <div className="hp-band relative z-[1] p-5 sm:p-7">
            <div className="relative z-[1] max-w-2xl space-y-3">
              <span className="hp-mark" aria-hidden />
              {eyebrow ? <p className="hp-eyebrow">{eyebrow}</p> : null}
              <h2 className="hp-heading text-[1.5rem] sm:text-[1.85rem]">{section.heading}</h2>
              <p className="hp-lede text-sm whitespace-pre-wrap sm:text-[0.975rem]">
                {section.body}
              </p>
              {section.cta.visible ? (
                <Link href={section.cta.href} className="inline-flex pt-1">
                  <Button className="min-h-11 rounded-full px-6 font-semibold shadow-[var(--hp-cta-shadow)]">
                    {section.cta.label}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <span className="hp-mark" aria-hidden />
            {eyebrow ? <p className="hp-eyebrow">{eyebrow}</p> : null}
            <h2 className="hp-heading text-[1.5rem] sm:text-[1.85rem]">{section.heading}</h2>
            <p className="hp-lede text-sm whitespace-pre-wrap sm:text-[0.975rem]">{section.body}</p>
            {section.cta.visible ? (
              <Link href={section.cta.href} className="inline-flex pt-1">
                <Button className="min-h-11 rounded-full px-6 font-semibold shadow-[var(--hp-cta-shadow)]">
                  {section.cta.label}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              </Link>
            ) : null}
          </>
        )}
      </HomepageReveal>
    </section>
  );
}
