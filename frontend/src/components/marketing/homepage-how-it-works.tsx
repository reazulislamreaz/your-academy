import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createDefaultExtendedSections, type HomepagePayload } from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/reveal';

type Props = {
  content?: HomepagePayload['howItWorks'];
};

export function HomepageHowItWorks({ content }: Props) {
  const data = content ?? createDefaultExtendedSections().howItWorks;
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="scroll-mt-24 bg-[color-mix(in_srgb,var(--bg-elevated)_90%,transparent)] py-[var(--space-section)]"
    >
      <Reveal className="marketing-container space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-2">
            <span className="hp-mark" aria-hidden />
            <h2
              id="how-heading"
              className="hp-heading text-[1.375rem] sm:text-2xl md:text-[2rem]"
            >
              {data.heading}
            </h2>
            {data.subtitle ? (
              <p className="hp-lede text-sm sm:text-base">{data.subtitle}</p>
            ) : null}
          </div>
          {data.cta.visible ? (
            <Link href={data.cta.href} className="w-full sm:w-auto">
              <Button className="min-h-11 w-full rounded-full px-6 shadow-[0_10px_24px_-12px_rgba(227,30,36,0.45)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 sm:w-auto">
                {data.cta.label}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
          ) : null}
        </div>

        <ol className="motion-stagger grid gap-3 sm:gap-4 md:grid-cols-3">
          {data.steps.map((item) => (
            <li
              key={`${item.step}-${item.title}`}
              className="hp-step p-4 sm:p-5 md:p-6"
            >
              <span className="font-display text-3xl font-extrabold tracking-tight text-[var(--highlight)]/30">
                {item.step}
              </span>
              <h3 className="mt-2 font-display text-lg font-bold text-[var(--ink)]">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-strong)]">{item.body}</p>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}
