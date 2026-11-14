import Link from 'next/link';
import { ArrowRight, Check, Trophy, TrendingUp } from 'lucide-react';
import type { HomepagePayload } from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/reveal';
import { HomepageIcon } from '@/lib/homepage-icon-map';

type Props = {
  why: HomepagePayload['why'];
  progress: HomepagePayload['progress'];
  ctaBanner: HomepagePayload['ctaBanner'];
};

const TONE: Record<
  'info' | 'success' | 'danger' | 'insight',
  { tone: string; valueClass: string; labelClass: string }
> = {
  info: {
    tone: 'text-[var(--info)] bg-[var(--info-soft)]',
    valueClass: 'text-[var(--ink)]',
    labelClass: 'text-[var(--muted)]',
  },
  success: {
    tone: 'text-[var(--success)] bg-[var(--success-soft)]',
    valueClass: 'text-[var(--success)]',
    labelClass: 'text-[var(--success)]',
  },
  danger: {
    tone: 'text-[var(--danger)] bg-[var(--danger-soft)]',
    valueClass: 'text-[var(--danger)]',
    labelClass: 'text-[var(--danger)]',
  },
  insight: {
    tone: 'text-[var(--insight)] bg-[var(--insight-soft)]',
    valueClass: 'text-[var(--insight)]',
    labelClass: 'text-[var(--insight)]',
  },
};

export function HomepageMidSections({ why, progress, ctaBanner }: Props) {
  if (!why.visible && !progress.visible && !ctaBanner.visible) return null;

  return (
    <section id="how-it-works" className="scroll-mt-24 pb-[var(--space-section)]">
      <Reveal className="motion-stagger mx-auto grid w-full max-w-[1280px] gap-5 px-4 sm:px-6 lg:grid-cols-3 lg:gap-6">
        {why.visible ? (
          <div className="ya-panel-shine relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--info-soft)] p-6 shadow-[var(--shadow-sm)] sm:p-7">
            <div className="relative z-[1]">
              <h2 className="font-display text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                {why.heading}
              </h2>
              <ul className="mt-5 space-y-3.5">
                {why.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2.5 text-sm font-medium text-[var(--ink-soft)]"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--info)] text-white">
                      <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="hidden lg:block" />
        )}

        {progress.visible ? (
          <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow-sm)]">
            <div className="flex items-center gap-2 border-b border-[var(--line)] bg-[var(--info-soft)] px-5 py-3.5">
              <HomepageIcon iconKey="barchart" className="h-5 w-5 text-[var(--info)]" />
              <h2 className="font-display text-lg font-bold tracking-tight text-[var(--ink)] sm:text-xl">
                {progress.heading}
              </h2>
            </div>
            <div className="p-5 sm:p-6">
              <dl className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                {progress.metrics.map((m) => {
                  const styles = TONE[m.tone] ?? TONE.info;
                  return (
                    <div
                      key={m.label}
                      className="space-y-1 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-desk)] px-1.5 py-2.5"
                    >
                      <span
                        className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full ${styles.tone}`}
                      >
                        <HomepageIcon iconKey={m.iconKey} className="h-4 w-4" />
                      </span>
                      <dd className={`font-display text-base leading-none font-bold ${styles.valueClass}`}>
                        {m.value}
                      </dd>
                      <dt className={`text-xs leading-snug font-medium ${styles.labelClass}`}>
                        {m.label}
                      </dt>
                    </div>
                  );
                })}
              </dl>
              <div className="relative mt-4">
                <svg
                  viewBox="0 0 320 90"
                  className="w-full"
                  role="img"
                  aria-label="Accuracy trend rising over time"
                >
                  <g stroke="var(--line)" strokeWidth="1">
                    <line x1="0" y1="22" x2="320" y2="22" />
                    <line x1="0" y1="47" x2="320" y2="47" />
                    <line x1="0" y1="72" x2="320" y2="72" />
                    <line x1="80" y1="10" x2="80" y2="80" />
                    <line x1="160" y1="10" x2="160" y2="80" />
                    <line x1="240" y1="10" x2="240" y2="80" />
                  </g>
                  <polyline
                    points="0,70 40,62 80,66 120,54 160,58 200,44 240,48 280,30 320,22"
                    fill="none"
                    stroke="var(--info)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--success-soft)] px-2.5 py-1.5 text-xs font-semibold text-[var(--success-fg)] shadow-sm sm:absolute sm:right-0 sm:bottom-0 sm:mt-0">
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                  {progress.trendCaption}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden lg:block" />
        )}

        {ctaBanner.visible ? (
          <div className="relative flex overflow-hidden rounded-[var(--radius-xl)] bg-[var(--bg-inverse)] p-7 text-center text-white shadow-[var(--shadow)]">
            <div
              aria-hidden
              className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-[var(--highlight)]/20 blur-3xl"
            />
            <Trophy
              aria-hidden
              className="absolute -right-4 -bottom-6 h-40 w-40 text-white/5"
              strokeWidth={1}
            />
            <div className="relative m-auto flex max-w-[16rem] flex-col items-center space-y-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm">
                <Trophy className="h-7 w-7" aria-hidden />
              </span>
              <h2 className="font-display text-2xl leading-tight font-bold tracking-tight">
                {ctaBanner.heading}
              </h2>
              <p className="text-sm leading-relaxed text-white/70">{ctaBanner.body}</p>
              {ctaBanner.cta.visible ? (
                <Link href={ctaBanner.cta.href}>
                  <Button className="rounded-full px-6">
                    {ctaBanner.cta.label}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </Reveal>
    </section>
  );
}
