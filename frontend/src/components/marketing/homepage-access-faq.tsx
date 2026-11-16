import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/reveal';

const FAQS = [
  {
    q: 'What is included in the 7-day free trial?',
    a: 'After registration, you get seven days of entitled access to correct answers, explanations, bookmarks, and timed practice. The trial is calculated from your signup timestamp on the server.',
  },
  {
    q: 'Can I browse questions without paying?',
    a: 'Yes. The public Preli Question Bank and published newspaper PDF columns are available without login. Learner practice routes and answer privacy still follow entitlement rules.',
  },
  {
    q: 'What happens when the trial ends?',
    a: 'You can still sign in, browse, search, and save bookmarks. Correct answers and explanations are omitted from learner APIs until a future paid plan entitles you again.',
  },
  {
    q: 'Is there a paid subscription price today?',
    a: 'Paid checkout is not live in v1. Subscription tables are ready for a future release — we will not invent prices on this page.',
  },
  {
    q: 'How do I create an account?',
    a: 'Use name, WhatsApp number, and password. Email is optional at registration and required only if you need password reset by email.',
  },
] as const;

export function HomepageAccessFaq() {
  return (
    <section
      id="access"
      aria-labelledby="access-heading"
      className="scroll-mt-24 bg-[var(--bg-desk)] py-[var(--space-section)]"
    >
      <Reveal className="marketing-container grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="space-y-5">
          <span className="mb-1 block h-[3px] w-7 rounded-full bg-[var(--highlight)]" aria-hidden />
          <h2
            id="access-heading"
            className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-[2rem]"
          >
            Access & pricing
          </h2>
          <p className="text-sm leading-relaxed text-[var(--muted-strong)] sm:text-base">
            Honest entitlements only. No invented student counts, success rates, or subscription
            prices.
          </p>
          <ul className="space-y-3 text-sm text-[var(--ink-soft)]">
            <li className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-3">
              <strong className="text-[var(--ink)]">Free to browse</strong> — Preli bank & published
              PDFs
            </li>
            <li className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-3">
              <strong className="text-[var(--ink)]">7-day trial</strong> — answers & explanations after
              signup
            </li>
            <li className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-3">
              <strong className="text-[var(--ink)]">Paid plans</strong> — coming in a later release
            </li>
          </ul>
          <Link href="/register" className="inline-flex">
            <Button className="rounded-full px-6">
              Start Your 7-Day Free Trial
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        </div>

        <div id="faq" className="scroll-mt-24 space-y-3">
          <h3 className="font-display text-xl font-bold tracking-tight text-[var(--ink)]">
            Frequently asked questions
          </h3>
          <div className="space-y-2">
            {FAQS.map((item) => (
              <details
                key={item.q}
                className="group rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-3 open:shadow-[var(--shadow-sm)]"
              >
                <summary className="cursor-pointer list-none font-display text-sm font-semibold text-[var(--ink)] marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-start justify-between gap-3">
                    {item.q}
                    <span
                      aria-hidden
                      className="mt-0.5 text-[var(--muted)] transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted-strong)]">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
