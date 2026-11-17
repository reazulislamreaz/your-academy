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
      className="scroll-mt-24 bg-[var(--bg-desk)] py-[var(--space-section)]"
    >
      <Reveal className="marketing-container space-y-6 sm:space-y-8">
        <div className="max-w-2xl space-y-2">
          <span className="mb-1 block h-[3px] w-7 rounded-full bg-[var(--highlight)]" aria-hidden />
          <h2
            id="features-heading"
            className="font-display text-[1.375rem] font-bold tracking-tight text-[var(--ink)] sm:text-2xl md:text-[2rem]"
          >
            {data.heading}
          </h2>
          {data.subtitle ? (
            <p className="text-sm text-[var(--muted-strong)] sm:text-base">{data.subtitle}</p>
          ) : (
            <p className="text-sm text-[var(--muted-strong)] sm:text-base">
              Every item below maps to a live route in this platform.
            </p>
          )}
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {data.items.map((feature) => {
            const Icon =
              ICON_MAP[feature.iconKey as keyof typeof ICON_MAP] ?? BookOpen;
            return (
              <li
                key={feature.id}
                className="ya-panel flex flex-col rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)] sm:p-5 md:p-6"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-wash)] text-[var(--accent)]">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold tracking-tight text-[var(--ink)]">
                  {feature.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--muted-strong)]">
                  {feature.body}
                </p>
                <Link href={feature.href} className="mt-4 inline-flex">
                  <Button variant="outline" size="sm" className="rounded-full px-4">
                    {feature.cta}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
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
