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
          <p className="hp-eyebrow mx-auto sm:mx-0">{data.eyebrow?.trim() || 'Product'}</p>
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
                  className="hp-card hp-card-interactive group flex h-full flex-col p-5 sm:p-6"
                >
                  <span className="hp-icon-chip h-11 w-11">
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
