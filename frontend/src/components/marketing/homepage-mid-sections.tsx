import { Check } from 'lucide-react';
import type { HomepagePayload } from '@your-academy/shared';
import { HomepageReveal } from '@/components/marketing/homepage-gsap';

type Props = {
  why: HomepagePayload['why'];
};

export function HomepageMidSections({ why }: Props) {
  if (!why.visible) return null;

  return (
    <section
      id="why-your-academy"
      aria-labelledby="why-heading"
      className="hp-section"
    >
      <HomepageReveal className="marketing-container" staggerChildren>
        <div className="hp-band relative z-[1] p-6 sm:p-8 lg:p-10" data-hp-stagger>
          <div className="relative z-[1] max-w-3xl">
            <span className="hp-mark mb-2" aria-hidden />
            <p className="hp-eyebrow mb-2">{why.eyebrow?.trim() || 'Why us'}</p>
            <h2 id="why-heading" className="hp-heading text-[1.5rem] sm:text-[1.85rem]">
              {why.heading}
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {why.points.map((point) => (
                <li
                  key={point}
                  data-hp-stagger
                  className="flex items-start gap-2.5 rounded-xl border border-transparent bg-[color-mix(in_srgb,var(--bg-elevated)_70%,transparent)] px-3 py-2.5 text-sm font-medium text-[var(--ink-soft)] transition-[border-color,background-color] duration-200 hover:border-[var(--hp-panel-border)] hover:bg-[var(--bg-elevated)]"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--highlight)] text-white shadow-[0_0_12px_-2px_color-mix(in_srgb,var(--highlight)_55%,transparent)]">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </HomepageReveal>
    </section>
  );
}
