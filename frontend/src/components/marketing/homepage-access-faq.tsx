import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { createDefaultExtendedSections, type HomepagePayload } from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { HomepagePlanComparison } from '@/components/marketing/homepage-plan-comparison';

type Props = {
  content?: HomepagePayload['accessFaq'];
};

export function HomepageAccessFaq({ content }: Props) {
  const data = content ?? createDefaultExtendedSections().accessFaq;
  // Previous left column — shown unchanged if the plan comparison cannot be loaded.
  const legacyIntro = (
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
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--highlight)]"
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
  );
  const faq = (
    <div id="faq" className="w-full min-w-0 scroll-mt-24 space-y-4 sm:space-y-5">
      <h3 className="hp-heading text-lg sm:text-xl">{data.faqHeading}</h3>
      <div className="space-y-3">
        {data.faqs.map((item) => (
          <details key={item.id} className="hp-faq-item hp-faq-card group">
            <summary className="block cursor-pointer list-none touch-manipulation rounded-[inherit] px-4 font-display text-[0.9375rem] font-semibold text-[var(--ink)] outline-none marker:content-none focus-visible:ring-2 focus-visible:ring-[var(--highlight)] focus-visible:ring-offset-2 sm:px-5 [&::-webkit-details-marker]:hidden">
              <span className="flex min-h-14 items-center justify-between gap-4 py-3.5 leading-[1.6]">
                {item.question}
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--hp-panel-border)] text-[var(--muted)] transition-[transform,border-color,color,background-color] duration-200 ease-out group-open:rotate-180 group-open:border-[var(--highlight)] group-open:bg-[var(--highlight-soft)] group-open:text-[var(--highlight)] motion-reduce:transition-none"
                >
                  <ChevronDown className="h-4 w-4" strokeWidth={2.25} />
                </span>
              </span>
            </summary>
            <p className="px-4 pb-5 text-sm leading-[1.8] text-[var(--muted-strong)] sm:px-5 sm:pr-16 sm:text-[0.9375rem]">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
  return (
    <section id="access" aria-labelledby="access-heading" className="hp-section hp-section-tone">
      <HomepagePlanComparison content={data} legacyIntro={legacyIntro} faq={faq} />
    </section>
  );
}
