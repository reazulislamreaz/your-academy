import { Check } from 'lucide-react';
import type { HomepagePayload } from '@your-academy/shared';
import { Reveal } from '@/components/motion/reveal';

type Props = {
  why: HomepagePayload['why'];
};

/** Why-choose panel — fabricated progress metrics removed from the public homepage. */
export function HomepageMidSections({ why }: Props) {
  if (!why.visible) return null;

  return (
    <section
      id="why-your-academy"
      aria-labelledby="why-heading"
      className="scroll-mt-24 bg-[var(--bg-elevated)] py-[var(--space-section)]"
    >
      <Reveal className="marketing-container">
        <div className="ya-panel-shine relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--info-soft)] p-6 shadow-[var(--shadow-sm)] sm:p-8 lg:p-10">
          <div className="relative z-[1] max-w-3xl">
            <span className="mb-2 block h-[3px] w-7 rounded-full bg-[var(--highlight)]" aria-hidden />
            <h2
              id="why-heading"
              className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-[2rem]"
            >
              {why.heading}
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {why.points.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 text-sm font-medium text-[var(--ink-soft)]"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--info)] text-white">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
