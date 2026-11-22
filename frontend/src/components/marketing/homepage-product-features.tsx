import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  FileText,
  LineChart,
  Newspaper,
  PenLine,
} from 'lucide-react';
import { createDefaultExtendedSections, type HomepagePayload } from '@your-academy/shared';
import { HomepageReveal } from '@/components/marketing/homepage-gsap';

const ICON_MAP = {
  book: BookOpen,
  pen: PenLine,
  clipboard: ClipboardList,
  file: FileText,
  chart: LineChart,
  newspaper: Newspaper,
} as const;

type Props = {
  content?: HomepagePayload['productFeatures'];
};

/** Feature grid from CMS `productFeatures.items` — aligned with hero craft. */
export function HomepageProductFeatures({ content }: Props) {
  const data = content ?? createDefaultExtendedSections().productFeatures;
  const subtitle =
    data.subtitle?.trim() ||
    'Every item below maps to a live route on Your Academy.';

  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="hp-section hp-section-tone"
    >
      <HomepageReveal className="marketing-container space-y-10 md:space-y-12" staggerChildren>
        <div className="mx-auto max-w-2xl space-y-3 text-center sm:mx-0 sm:max-w-xl sm:text-left" data-hp-stagger>
          <span className="hp-mark mx-auto sm:mx-0" aria-hidden />
          <h2
            id="features-heading"
            className="hp-heading text-[1.5rem] sm:text-2xl md:text-[1.9rem]"
          >
            {data.heading}
          </h2>
          <p className="hp-lede text-sm sm:text-[0.975rem]">{subtitle}</p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {data.items.map((feature) => {
            const Icon =
              ICON_MAP[feature.iconKey as keyof typeof ICON_MAP] ?? BookOpen;

            return (
              <li key={feature.id} data-hp-stagger className="min-w-0">
                <Link
                  href={feature.href}
                  className="group flex h-full flex-col rounded-2xl border border-[var(--hp-panel-border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--hp-shadow)] ring-1 ring-black/[0.03] transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--ink)_12%,var(--line))] hover:shadow-[var(--hp-shadow-hover)] sm:p-6"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--hp-panel-border)] bg-[var(--bg-muted)] text-[var(--ink-soft)] transition-[border-color,background-color,color] duration-200 group-hover:border-[color-mix(in_srgb,var(--highlight)_22%,var(--line))] group-hover:bg-[var(--highlight-soft)] group-hover:text-[var(--highlight)]">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>

                  <h3 className="mt-5 font-display text-[1.05rem] font-semibold tracking-tight text-[var(--ink)] sm:text-lg">
                    {feature.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-pretty text-[var(--muted-strong)]">
                    {feature.body}
                  </p>

                  <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--highlight)]">
                    {feature.cta}
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-1"
                      aria-hidden
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </HomepageReveal>
    </section>
  );
}
