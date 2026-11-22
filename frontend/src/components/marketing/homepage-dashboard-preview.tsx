import Link from 'next/link';
import { ArrowRight, Bookmark, ChartColumn, CheckCircle2, Timer } from 'lucide-react';
import { createDefaultExtendedSections, type HomepagePayload } from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { HomepageReveal } from '@/components/marketing/homepage-gsap';

type Props = {
  content?: HomepagePayload['dashboardPreview'];
};

const DESK_TILES = [
  { icon: ChartColumn, label: 'Attempt history', hint: 'From your practice sessions' },
  { icon: CheckCircle2, label: 'Accuracy', hint: 'Calculated from real answers' },
  { icon: Timer, label: 'Timed exams', hint: 'Countdown + review' },
  { icon: Bookmark, label: 'Bookmarks', hint: 'Save MCQs to revisit' },
] as const;

/**
 * Static chrome preview of the learner desk — labels only, no fabricated metrics.
 */
export function HomepageDashboardPreview({ content }: Props) {
  const data = content ?? createDefaultExtendedSections().dashboardPreview;

  return (
    <section
      id="dashboard-preview"
      aria-labelledby="dashboard-preview-heading"
      className="hp-section"
    >
      <HomepageReveal className="marketing-container grid items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14 xl:gap-16">
        <div className="space-y-5 lg:max-w-md">
          <span className="hp-mark" aria-hidden />
          <p className="hp-eyebrow">Learner desk</p>
          <div className="space-y-3">
            <h2
              id="dashboard-preview-heading"
              className="hp-heading text-[1.5rem] sm:text-2xl md:text-[1.9rem]"
            >
              {data.heading}
            </h2>
            <p className="hp-lede text-sm leading-relaxed sm:text-[0.975rem]">{data.body}</p>
          </div>

          <div className="flex w-full flex-col gap-2.5 pt-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            {data.primaryCta.visible ? (
              <Link href={data.primaryCta.href} className="w-full sm:w-auto">
                <Button className="group min-h-11 w-full rounded-full px-6 font-semibold shadow-[var(--hp-cta-shadow)] sm:w-auto">
                  {data.primaryCta.label}
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Button>
              </Link>
            ) : null}
            {data.secondaryCta.visible ? (
              <Link href={data.secondaryCta.href} className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="min-h-11 w-full rounded-full border-[var(--hp-panel-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),var(--bg-elevated))] px-6 font-semibold shadow-[var(--shadow-sm)] transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-[var(--hp-panel-border-strong)] sm:w-auto"
                >
                  {data.secondaryCta.label}
                </Button>
              </Link>
            ) : null}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-5 rounded-[2rem] bg-[radial-gradient(ellipse_at_55%_40%,color-mix(in_srgb,var(--highlight)_8%,transparent),transparent_68%)] blur-2xl sm:-inset-7"
          />

          <div
            className="hp-panel relative overflow-hidden rounded-[var(--hp-radius-lg)] ring-1 ring-black/[0.03]"
            aria-hidden
          >
            <div className="flex items-center gap-2 border-b border-[var(--hp-panel-border)] bg-[color-mix(in_srgb,var(--bg-muted)_70%,var(--bg-elevated))] px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-[color-mix(in_srgb,var(--ink)_18%,transparent)]" />
              <span className="h-2 w-2 rounded-full bg-[color-mix(in_srgb,var(--ink)_14%,transparent)]" />
              <span className="h-2 w-2 rounded-full bg-[color-mix(in_srgb,var(--ink)_10%,transparent)]" />
              <span className="ml-2 text-xs font-semibold tracking-tight text-[var(--ink)]">
                Learner dashboard
              </span>
              <span className="ml-auto hidden rounded-full bg-[var(--highlight-soft)] px-2.5 py-0.5 text-[0.65rem] font-semibold text-[var(--highlight)] sm:inline">
                After sign-in
              </span>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:gap-3.5 sm:p-5">
              {DESK_TILES.map((tile) => {
                const Icon = tile.icon;
                return (
                  <div
                    key={tile.label}
                    className="rounded-[0.9rem] border border-[var(--hp-panel-border)] bg-[var(--bg)] p-4 shadow-[var(--shadow-sm)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[var(--hp-panel-border-strong)] hover:shadow-[var(--hp-shadow)]"
                  >
                    <span className="hp-icon-chip h-9 w-9">
                      <Icon className="h-4 w-4" />
                    </span>
                    <p className="mt-3 text-sm font-semibold tracking-tight text-[var(--ink)]">
                      {tile.label}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{tile.hint}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </HomepageReveal>
    </section>
  );
}
