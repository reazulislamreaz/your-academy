import Link from 'next/link';
import { BookOpen, FolderTree, Layers, Newspaper } from 'lucide-react';
import type { PublicPlatformStats } from '@/lib/api/public-stats';
import { Reveal } from '@/components/motion/reveal';

type Props = {
  stats: PublicPlatformStats | null;
};

function formatCount(n: number): string {
  return new Intl.NumberFormat('en-BD').format(n);
}

const ITEMS = [
  {
    key: 'questions' as const,
    label: 'Published MCQs',
    href: '/preli-question-bank',
    icon: BookOpen,
  },
  {
    key: 'questionSets' as const,
    label: 'Question collections',
    href: '/preli-question-bank',
    icon: Layers,
  },
  {
    key: 'categories' as const,
    label: 'Exam categories',
    href: '/question-bank-categories',
    icon: FolderTree,
  },
  {
    key: 'documents' as const,
    label: 'Newspaper columns',
    href: '/news',
    icon: Newspaper,
  },
];

/** Verified platform counts from the API — never fabricated. */
export function HomepageLiveStats({ stats }: Props) {
  return (
    <section
      id="platform-stats"
      aria-labelledby="stats-heading"
      className="scroll-mt-24 bg-[var(--bg-elevated)] py-[var(--space-section)]"
    >
      <Reveal className="marketing-container space-y-6">
        <div className="max-w-2xl space-y-2">
          <span className="mb-1 block h-[3px] w-7 rounded-full bg-[var(--highlight)]" aria-hidden />
          <h2
            id="stats-heading"
            className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-[2rem]"
          >
            Live platform library
          </h2>
          <p className="text-sm text-[var(--muted-strong)] sm:text-base">
            Counts refresh from published content in the database — not marketing estimates.
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const raw = stats?.[item.key];
            const value = raw == null ? '—' : formatCount(raw);
            return (
              <div
                key={item.key}
                className="ya-panel-shine rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-desk)] p-4 sm:p-5"
              >
                <dt className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">
                  <Icon className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                  {item.label}
                </dt>
                <dd className="mt-2 font-display text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
                  <Link
                    href={item.href}
                    className="transition-colors hover:text-[var(--highlight)]"
                  >
                    {value}
                  </Link>
                </dd>
              </div>
            );
          })}
        </dl>
      </Reveal>
    </section>
  );
}
