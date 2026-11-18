import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { HomepagePayload } from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/reveal';

type Props = {
  section: HomepagePayload['customSections'][number];
};

/** Admin-created freeform content block. */
export function HomepageCustomSection({ section }: Props) {
  if (!section.visible) return null;
  return (
    <section className="scroll-mt-24 py-[var(--space-section)]">
      <Reveal className="marketing-container max-w-3xl space-y-4">
        <span className="hp-mark" aria-hidden />
        <h2 className="hp-heading text-2xl sm:text-[2rem]">
          {section.heading}
        </h2>
        <p className="hp-lede text-sm whitespace-pre-wrap sm:text-base">
          {section.body}
        </p>
        {section.cta.visible ? (
          <Link href={section.cta.href} className="inline-flex pt-1">
            <Button className="rounded-full px-6 shadow-[0_10px_24px_-12px_rgba(227,30,36,0.45)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5">
              {section.cta.label}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        ) : null}
      </Reveal>
    </section>
  );
}
