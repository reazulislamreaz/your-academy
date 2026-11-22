import Link from 'next/link';
import { ArrowRight, BookOpenCheck, LayoutDashboard, UserPlus } from 'lucide-react';
import { createDefaultExtendedSections, type HomepagePayload } from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { HomepageReveal } from '@/components/marketing/homepage-gsap';

const STEP_ICONS = [BookOpenCheck, UserPlus, LayoutDashboard] as const;

type Props = {
  content?: HomepagePayload['howItWorks'];
};

export function HomepageHowItWorks({ content }: Props) {
  const data = content ?? createDefaultExtendedSections().howItWorks;

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="hp-section hp-section-tone"
    >
      <HomepageReveal className="marketing-container space-y-10 md:space-y-12" staggerChildren>
        <div
          className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8"
          data-hp-stagger
        >
          <div className="max-w-xl space-y-3">
            <span className="hp-mark" aria-hidden />
            <h2
              id="how-heading"
              className="hp-heading text-[1.5rem] sm:text-2xl md:text-[1.9rem]"
            >
              {data.heading}
            </h2>
            {data.subtitle ? (
              <p className="hp-lede text-sm sm:text-[0.975rem]">{data.subtitle}</p>
            ) : null}
          </div>
          {data.cta.visible ? (
            <Link href={data.cta.href} className="w-full shrink-0 sm:w-auto">
              <Button className="group min-h-11 w-full rounded-full px-6 font-semibold shadow-[0_10px_28px_-14px_rgba(227,30,36,0.4)] sm:w-auto">
                {data.cta.label}
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Button>
            </Link>
          ) : null}
        </div>

        <ol className="relative grid gap-4 md:grid-cols-3 md:gap-5">
          <div
            aria-hidden
            className="pointer-events-none absolute top-[2.15rem] right-[8%] left-[8%] hidden h-px bg-[color-mix(in_srgb,var(--hp-panel-border)_90%,var(--ink))] md:block"
          />

          {data.steps.map((item, index) => {
            const Icon = STEP_ICONS[index] ?? BookOpenCheck;
            const stepLabel = item.step || String(index + 1).padStart(2, '0');

            return (
              <li key={`${item.step}-${item.title}`} data-hp-stagger className="relative min-w-0">
                <article className="group flex h-full flex-col rounded-2xl border border-[var(--hp-panel-border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--hp-shadow)] ring-1 ring-black/[0.03] transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--ink)_12%,var(--line))] hover:shadow-[var(--hp-shadow-hover)] sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="relative z-[1] inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--hp-panel-border)] bg-[var(--bg-muted)] text-[var(--ink-soft)] transition-[border-color,background-color,color] duration-200 group-hover:border-[color-mix(in_srgb,var(--highlight)_22%,var(--line))] group-hover:bg-[var(--highlight-soft)] group-hover:text-[var(--highlight)]">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="font-display text-[0.75rem] font-semibold tracking-[0.08em] text-[var(--highlight)] tabular-nums">
                      {stepLabel}
                    </span>
                  </div>

                  <h3 className="mt-5 font-display text-[1.05rem] font-semibold tracking-tight text-[var(--ink)] sm:text-lg">
                    {item.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-pretty text-[var(--muted-strong)]">
                    {item.body}
                  </p>
                </article>
              </li>
            );
          })}
        </ol>
      </HomepageReveal>
    </section>
  );
}
