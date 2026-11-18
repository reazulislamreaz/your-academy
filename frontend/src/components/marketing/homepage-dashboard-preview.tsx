import Link from 'next/link';
import { ArrowRight, Bookmark, ChartColumn, CheckCircle2, Timer } from 'lucide-react';
import { createDefaultExtendedSections, type HomepagePayload } from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/reveal';

type Props = {
  content?: HomepagePayload['dashboardPreview'];
};

/**
 * Static chrome preview of the learner desk — labels only, no fabricated metrics.
 */
export function HomepageDashboardPreview({ content }: Props) {
  const data = content ?? createDefaultExtendedSections().dashboardPreview;
  return (
    <section
      id="dashboard-preview"
      aria-labelledby="dashboard-preview-heading"
      className="scroll-mt-24 py-[var(--space-section)]"
    >
      <Reveal className="marketing-container grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="space-y-4">
          <span className="hp-mark" aria-hidden />
          <h2
            id="dashboard-preview-heading"
            className="hp-heading text-2xl sm:text-[2rem]"
          >
            {data.heading}
          </h2>
          <p className="hp-lede text-sm sm:text-base">
            {data.body}
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            {data.primaryCta.visible ? (
              <Link href={data.primaryCta.href}>
                <Button className="rounded-full px-6 shadow-[0_10px_24px_-12px_rgba(227,30,36,0.45)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5">
                  {data.primaryCta.label}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              </Link>
            ) : null}
            {data.secondaryCta.visible ? (
              <Link href={data.secondaryCta.href}>
                <Button variant="outline" className="rounded-full px-6 transition-[transform,border-color] duration-200 hover:-translate-y-0.5">
                  {data.secondaryCta.label}
                </Button>
              </Link>
            ) : null}
          </div>
        </div>

        <div
          className="hp-surface overflow-hidden"
          aria-hidden
        >
          <div className="flex items-center gap-2 border-b border-white/10 bg-[var(--bg-inverse)] px-4 py-3 text-white">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--highlight)] shadow-[0_0_0_3px_rgba(227,30,36,0.25)]" />
            <span className="text-sm font-semibold tracking-tight">Learner dashboard</span>
          </div>
          <div className="motion-stagger grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
            {[
              { icon: ChartColumn, label: 'Attempt history', hint: 'From your practice sessions' },
              { icon: CheckCircle2, label: 'Accuracy', hint: 'Calculated from real answers' },
              { icon: Timer, label: 'Timed exams', hint: 'PracticeSet countdown + review' },
              { icon: Bookmark, label: 'Bookmarks', hint: 'Save MCQs to revisit later' },
            ].map((tile) => {
              const Icon = tile.icon;
              return (
                <div
                  key={tile.label}
                  className="rounded-[var(--radius)] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),var(--bg-desk))] p-3.5 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-[var(--highlight)]/30"
                >
                  <span className="hp-icon-chip h-8 w-8">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="mt-2.5 text-sm font-semibold text-[var(--ink)]">{tile.label}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{tile.hint}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
