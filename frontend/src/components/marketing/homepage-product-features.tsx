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
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/reveal';

const FEATURES = [
  {
    title: 'MCQ Question Bank',
    body: 'Browse published Preli MCQs with filters for topic, year, and exam tags — no login required to read questions.',
    href: '/preli-question-bank',
    cta: 'Browse Preli bank',
    icon: BookOpen,
    available: true,
  },
  {
    title: 'Written Question Bank',
    body: 'Dedicated written bank route for long-form practice materials as admins publish them.',
    href: '/written-question-bank',
    cta: 'Open written bank',
    icon: PenLine,
    available: true,
  },
  {
    title: 'Topic-based practice',
    body: 'Jump into Bangla, English, Math, GK, ICT, and more from curated topic tiles.',
    href: '/topic-categories',
    cta: 'View topics',
    icon: ClipboardList,
    available: true,
  },
  {
    title: 'Mock tests & timed exams',
    body: 'Signed-in learners can take PracticeSet exams with timers, mark-for-review, and scored results.',
    href: '/register',
    cta: 'Create account to practice',
    icon: FileText,
    available: true,
  },
  {
    title: 'Performance tracking',
    body: 'Your dashboard shows real attempts, accuracy, and subject performance after you practice — never placeholder scores.',
    href: '/login',
    cta: 'Sign in to dashboard',
    icon: LineChart,
    available: true,
  },
  {
    title: 'Newspaper columns',
    body: 'Admin-published PDF columns for current-affairs reading — open freely from the news library.',
    href: '/news',
    cta: 'Read columns',
    icon: Newspaper,
    available: true,
  },
] as const;

export function HomepageProductFeatures() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="scroll-mt-24 bg-[var(--bg-desk)] py-[var(--space-section)]"
    >
      <Reveal className="marketing-container space-y-8">
        <div className="max-w-2xl space-y-2">
          <span className="mb-1 block h-[3px] w-7 rounded-full bg-[var(--highlight)]" aria-hidden />
          <h2
            id="features-heading"
            className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-[2rem]"
          >
            What you can do on Your Academy
          </h2>
          <p className="text-sm text-[var(--muted-strong)] sm:text-base">
            Every item below maps to a live route in this platform.
          </p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <li
                key={feature.title}
                className="ya-panel flex flex-col rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)] sm:p-6"
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
