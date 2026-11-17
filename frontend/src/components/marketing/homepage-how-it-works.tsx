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
      className="scroll-mt-24 bg-[var(--bg-elevated)] py-[var(--space-section)]"
    >
      <Reveal className="marketing-container space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-2">
            <span className="mb-1 block h-[3px] w-7 rounded-full bg-[var(--highlight)]" aria-hidden />
            <h2
              id="how-heading"
              className="font-display text-[1.375rem] font-bold tracking-tight text-[var(--ink)] sm:text-2xl md:text-[2rem]"
            >
              {data.heading}
            </h2>
            {data.subtitle ? (
              <p className="text-sm text-[var(--muted-strong)] sm:text-base">{data.subtitle}</p>
            ) : null}
          </div>
          {data.cta.visible ? (
            <Link href={data.cta.href} className="w-full sm:w-auto">
              <Button className="min-h-11 w-full rounded-full px-6 sm:w-auto">
                {data.cta.label}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
          ) : null}
        </div>

        <ol className="grid gap-3 sm:gap-4 md:grid-cols-3">
          {data.steps.map((item) => (
            <li
              key={`${item.step}-${item.title}`}
              className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-desk)] p-4 sm:p-5 md:p-6"
            >
              <span className="font-display text-3xl font-extrabold tracking-tight text-[var(--highlight)]/25">
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
