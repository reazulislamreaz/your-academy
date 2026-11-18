import Link from 'next/link';
import { BookOpen, FolderTree, Layers, Newspaper } from 'lucide-react';
import type { HomepagePayload } from '@your-academy/shared';
import type { PublicPlatformStats } from '@/lib/api/public-stats';
import { Reveal } from '@/components/motion/reveal';

type Props = {
  stats: PublicPlatformStats | null;
  content?: HomepagePayload['liveStats'];
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
export function HomepageLiveStats({ stats, content }: Props) {
  const heading = content?.heading?.trim() || 'Live platform library';
  return (
    <section
      id="platform-stats"
      aria-labelledby="stats-heading"
      className="scroll-mt-24 bg-[color-mix(in_srgb,var(--bg-elevated)_88%,transparent)] py-[var(--space-section)]"
    >
      <Reveal className="marketing-container space-y-6 sm:space-y-8">
        <div className="max-w-2xl space-y-2">
          <span className="hp-mark" aria-hidden />
          <h2 id="stats-heading" className="hp-heading text-2xl sm:text-[2rem]">
            {heading}
          </h2>
          <p className="hp-lede text-sm sm:text-base">
            Counts refresh from published content in the database — not marketing estimates.
          </p>
        </div>

        <dl className="motion-stagger grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const raw = stats?.[item.key];
            const value = raw == null ? '—' : formatCount(raw);
            return (
              <div key={item.key} className="hp-card hp-card-interactive p-4 sm:p-5">
                <dt className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">
                  <span className="hp-icon-chip h-7 w-7">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  {item.label}
                </dt>
                <dd className="mt-3 font-display text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
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
