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
      className="scroll-mt-24 py-[var(--space-section)]"
    >
      <Reveal className="marketing-container">
        <div className="hp-band relative overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="relative z-[1] max-w-3xl">
            <span className="hp-mark mb-2" aria-hidden />
            <h2 id="why-heading" className="hp-heading text-2xl sm:text-[2rem]">
              {why.heading}
            </h2>
            <ul className="motion-stagger mt-6 grid gap-3 sm:grid-cols-2">
              {why.points.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 rounded-[var(--radius)] border border-white/50 bg-white/55 px-3 py-2.5 text-sm font-medium text-[var(--ink-soft)] shadow-[0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-[2px]"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--info)] text-white shadow-sm">
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
