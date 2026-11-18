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
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/reveal';

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

export function HomepageProductFeatures({ content }: Props) {
  const data = content ?? createDefaultExtendedSections().productFeatures;
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="scroll-mt-24 py-[var(--space-section)]"
    >
      <Reveal className="marketing-container space-y-6 sm:space-y-8">
        <div className="max-w-2xl space-y-2">
          <span className="hp-mark" aria-hidden />
          <h2
            id="features-heading"
            className="hp-heading text-[1.375rem] sm:text-2xl md:text-[2rem]"
          >
            {data.heading}
          </h2>
          {data.subtitle ? (
            <p className="hp-lede text-sm sm:text-base">{data.subtitle}</p>
          ) : (
            <p className="hp-lede text-sm sm:text-base">
              Every item below maps to a live route in this platform.
            </p>
          )}
        </div>

        <ul className="motion-stagger grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {data.items.map((feature) => {
            const Icon =
              ICON_MAP[feature.iconKey as keyof typeof ICON_MAP] ?? BookOpen;
            return (
              <li
                key={feature.id}
                className="hp-card hp-card-interactive group flex flex-col p-4 sm:p-5 md:p-6"
              >
                <span className="hp-icon-chip h-11 w-11">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold tracking-tight text-[var(--ink)]">
                  {feature.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--muted-strong)]">
                  {feature.body}
                </p>
                <Link href={feature.href} className="mt-4 inline-flex">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full px-4 transition-[border-color,background-color,transform] duration-200 group-hover:border-[var(--highlight)]/40"
                  >
                    {feature.cta}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                  </Button>
                </Link>
              </li>
            );
          })}
        </ul>
      </Reveal>
    </section>
  );
}
