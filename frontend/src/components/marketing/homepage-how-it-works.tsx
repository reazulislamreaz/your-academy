import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/reveal';

const STEPS = [
  {
    step: '01',
    title: 'Browse freely',
    body: 'Open the Preli Question Bank and newspaper columns without an account.',
  },
  {
    step: '02',
    title: 'Start your trial',
    body: 'Register with name, WhatsApp, and password. Your 7-day trial begins immediately.',
  },
  {
    step: '03',
    title: 'Practice & track',
    body: 'Unlock answers and explanations, take timed sets, bookmark questions, and follow progress on your dashboard.',
  },
] as const;

export function HomepageHowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="scroll-mt-24 bg-[var(--bg-elevated)] py-[var(--space-section)]"
    >
      <Reveal className="marketing-container space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <span className="mb-1 block h-[3px] w-7 rounded-full bg-[var(--highlight)]" aria-hidden />
            <h2
              id="how-heading"
              className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-[2rem]"
            >
              How Your Academy works
            </h2>
            <p className="text-sm text-[var(--muted-strong)] sm:text-base">
              A clear path from first visit to daily practice.
            </p>
          </div>
          <Link href="/register">
            <Button className="rounded-full px-6">
              Create account
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        </div>

        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((item) => (
            <li
              key={item.step}
              className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-desk)] p-5 sm:p-6"
            >
              <span className="font-display text-3xl font-extrabold tracking-tight text-[var(--highlight)]/25">
                {item.step}
              </span>
              <h3 className="mt-2 font-display text-lg font-bold text-[var(--ink)]">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-strong)]">{item.body}</p>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}
