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
      className="scroll-mt-24 bg-[var(--bg-desk)] py-[var(--space-section)]"
    >
      <Reveal className="marketing-container grid gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="space-y-4 sm:space-y-5">
          <span className="mb-1 block h-[3px] w-7 rounded-full bg-[var(--highlight)]" aria-hidden />
          <h2
            id="access-heading"
            className="font-display text-[1.375rem] font-bold tracking-tight text-[var(--ink)] sm:text-2xl md:text-[2rem]"
          >
            {data.heading}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--muted-strong)] sm:text-base">
            {data.body}
          </p>
          <ul className="space-y-3 text-sm text-[var(--ink-soft)]">
            {data.highlights.map((item) => (
              <li
                key={item}
                className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-3"
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
              <Button className="min-h-11 w-full rounded-full px-6 sm:w-auto">
                {data.cta.label}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
          ) : null}
        </div>

        <div id="faq" className="scroll-mt-24 space-y-3">
          <h3 className="font-display text-lg font-bold tracking-tight text-[var(--ink)] sm:text-xl">
            {data.faqHeading}
          </h3>
          <div className="space-y-2">
            {data.faqs.map((item) => (
              <details
                key={item.id}
                className="group rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] px-3.5 py-3 open:shadow-[var(--shadow-sm)] sm:px-4"
              >
                <summary className="min-h-11 cursor-pointer list-none touch-manipulation font-display text-sm font-semibold text-[var(--ink)] marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-start justify-between gap-3 py-1">
                    {item.question}
                    <span
                      aria-hidden
                      className="mt-0.5 text-[var(--muted)] transition-transform group-open:rotate-45"
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
