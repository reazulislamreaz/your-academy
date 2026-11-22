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
      className="hp-section"
    >
      <HomepageReveal className="marketing-container space-y-10 md:space-y-12" staggerChildren>
        <div
          className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8"
          data-hp-stagger
        >
          <div className="max-w-xl space-y-3">
            <span className="hp-mark" aria-hidden />
            <p className="hp-eyebrow">{data.eyebrow?.trim() || 'Workflow'}</p>
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
              <Button className="group min-h-11 w-full rounded-full px-6 font-semibold shadow-[var(--hp-cta-shadow)] sm:w-auto">
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
            className="pointer-events-none absolute top-[2.15rem] right-[8%] left-[8%] hidden h-px bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--hp-panel-border)_90%,var(--ink))] to-transparent md:block"
          />

          {data.steps.map((item, index) => {
            const Icon = STEP_ICONS[index] ?? BookOpenCheck;
            const stepLabel = item.step || String(index + 1).padStart(2, '0');

            return (
              <li key={`${item.step}-${item.title}`} data-hp-stagger className="relative min-w-0">
                <article className="hp-step group flex h-full flex-col p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="hp-icon-chip relative z-[1] h-11 w-11">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="type-bn-serial text-[0.75rem] text-[var(--highlight)]">
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
