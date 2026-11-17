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
    <section className="scroll-mt-24 bg-[var(--bg-elevated)] py-[var(--space-section)]">
      <Reveal className="marketing-container max-w-3xl space-y-4">
        <span className="mb-1 block h-[3px] w-7 rounded-full bg-[var(--highlight)]" aria-hidden />
        <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-[2rem]">
          {section.heading}
        </h2>
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-[var(--muted-strong)] sm:text-base">
          {section.body}
        </p>
        {section.cta.visible ? (
          <Link href={section.cta.href} className="inline-flex pt-1">
            <Button className="rounded-full px-6">
              {section.cta.label}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        ) : null}
      </Reveal>
    </section>
  );
}
