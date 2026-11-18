import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createDefaultExtendedSections, type HomepagePayload } from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/reveal';

type Props = {
  content?: HomepagePayload['accessFaq'];
};

export function HomepageAccessFaq({ content }: Props) {
  const data = content ?? createDefaultExtendedSections().accessFaq;
  return (
    <section
      id="access"
      aria-labelledby="access-heading"
      className="scroll-mt-24 py-[var(--space-section)]"
    >
      <Reveal className="marketing-container grid gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="space-y-4 sm:space-y-5">
          <span className="hp-mark" aria-hidden />
          <h2
            id="access-heading"
            className="hp-heading text-[1.375rem] sm:text-2xl md:text-[2rem]"
          >
            {data.heading}
          </h2>
          <p className="hp-lede text-sm sm:text-base">
            {data.body}
          </p>
          <ul className="motion-stagger space-y-3 text-sm text-[var(--ink-soft)]">
            {data.highlights.map((item) => (
              <li
                key={item}
                className="hp-surface rounded-[var(--radius)] px-4 py-3"
              >
                {item.includes(' — ') ? (
                  <>
                    <strong className="text-[var(--ink)]">{item.split(' — ')[0]}</strong>
                    {' — '}
                    {item.split(' — ').slice(1).join(' — ')}
                  </>
                ) : (
                  <span className="text-[var(--ink)]">{item}</span>
                )}
              </li>
            ))}
          </ul>
          {data.cta.visible ? (
            <Link href={data.cta.href} className="inline-flex w-full sm:w-auto">
              <Button className="min-h-11 w-full rounded-full px-6 shadow-[0_10px_24px_-12px_rgba(227,30,36,0.45)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 sm:w-auto">
                {data.cta.label}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
          ) : null}
        </div>

        <div id="faq" className="scroll-mt-24 space-y-3">
          <h3 className="hp-heading text-lg sm:text-xl">
            {data.faqHeading}
          </h3>
          <div className="space-y-2.5">
            {data.faqs.map((item) => (
              <details
                key={item.id}
                className="hp-faq-item group px-3.5 py-3 sm:px-4"
              >
                <summary className="min-h-11 cursor-pointer list-none touch-manipulation font-display text-sm font-semibold text-[var(--ink)] marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-start justify-between gap-3 py-1">
                    {item.question}
                    <span
                      aria-hidden
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--bg-desk)] text-[var(--muted)] transition-transform duration-200 group-open:rotate-45 group-open:bg-[var(--highlight-soft)] group-open:text-[var(--highlight)]"
                    >
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted-strong)]">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
