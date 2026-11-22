import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createDefaultExtendedSections, type HomepagePayload } from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { HomepageReveal } from '@/components/marketing/homepage-gsap';

type Props = {
  content?: HomepagePayload['accessFaq'];
};

export function HomepageAccessFaq({ content }: Props) {
  const data = content ?? createDefaultExtendedSections().accessFaq;
  return (
    <section id="access" aria-labelledby="access-heading" className="hp-section hp-section-tone">
      <HomepageReveal className="marketing-container grid min-w-0 gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <span className="hp-mark" aria-hidden />
          <p className="hp-eyebrow">{data.eyebrow?.trim() || 'Access'}</p>
          <h2
            id="access-heading"
            className="hp-heading text-[1.35rem] sm:text-2xl md:text-[1.85rem]"
          >
            {data.heading}
          </h2>
          <p className="hp-lede text-sm sm:text-[0.975rem]">{data.body}</p>
          <ul className="space-y-3 text-sm text-[var(--ink-soft)]">
            {data.highlights.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--highlight)] shadow-[0_0_10px_-1px_color-mix(in_srgb,var(--highlight)_60%,transparent)]"
                  aria-hidden
                />
                <span>
                  {item.includes(' — ') ? (
                    <>
                      <strong className="font-semibold text-[var(--ink)]">
                        {item.split(' — ')[0]}
                      </strong>
                      {' — '}
                      {item.split(' — ').slice(1).join(' — ')}
                    </>
                  ) : (
                    <span className="text-[var(--ink)]">{item}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {data.cta.visible ? (
            <Link href={data.cta.href} className="inline-flex w-full sm:w-auto">
              <Button className="min-h-11 w-full rounded-full px-6 font-semibold shadow-[var(--hp-cta-shadow)] sm:w-auto">
                {data.cta.label}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
          ) : null}
        </div>

        <div id="faq" className="scroll-mt-24 space-y-4">
          <h3 className="hp-heading text-lg sm:text-xl">{data.faqHeading}</h3>
          <div className="space-y-2.5">
            {data.faqs.map((item) => (
              <details key={item.id} className="hp-faq-item group px-4">
                <summary className="min-h-12 cursor-pointer list-none touch-manipulation font-display text-sm font-semibold text-[var(--ink)] marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-3 py-3.5">
                    {item.question}
                    <span
                      aria-hidden
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--hp-panel-border)] text-[var(--muted)] transition-transform duration-200 group-open:rotate-45 group-open:border-[var(--highlight)] group-open:text-[var(--highlight)]"
                    >
                      +
                    </span>
                  </span>
                </summary>
                <p className="pr-10 pb-4 text-sm leading-relaxed text-[var(--muted-strong)]">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </HomepageReveal>
    </section>
  );
}
