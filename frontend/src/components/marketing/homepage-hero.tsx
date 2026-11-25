'use client';

import { DEFAULT_HERO_QUICK_LINKS } from '@your-academy/shared';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { HomepagePayload } from '@your-academy/shared';
import { HomepageHeroEntrance } from '@/components/marketing/homepage-gsap';
import { HomepageHeroVisual } from '@/components/marketing/homepage-hero-visual';
import { Button } from '@/components/ui/button';
import type { PublicPlatformStats } from '@/lib/api/public-stats';
import { cn } from '@/lib/utils';

type Props = {
  hero: HomepagePayload['hero'];
  heroImageUrl?: string | null;
  liveStats?: PublicPlatformStats | null;
};

/** Fallback when the CMS has no quick links (DEC-069: edited in Admin → Homepage → Hero). */
const EXAM_PILLS = DEFAULT_HERO_QUICK_LINKS;

function formatCount(n: number): string {
  return new Intl.NumberFormat('en-BD').format(n);
}

function resolveCtaLabel(label: string, fallback: string): string {
  const trimmed = label.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function resolveCtaHref(href: string, fallback: string): string {
  const trimmed = href.trim();
  if (!trimmed) return fallback;
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const u = new URL(trimmed);
      return `${u.pathname}${u.search}${u.hash}` || fallback;
    }
  } catch {
    // keep as-is below
  }
  return trimmed.startsWith('/') || trimmed.startsWith('http') ? trimmed : fallback;
}

/**
 * Homepage hero — CMS-driven copy/CTAs/image + live stats.
 * Asymmetric split: clarity & action left, framed showcase right.
 */
export function HomepageHero({ hero, heroImageUrl, liveStats = null }: Props) {
  if (!hero.visible) return null;

  const brand = hero.titleBefore.trim() || 'Your Academy';
  const highlight = hero.titleHighlight.trim();
  const sideLabel = hero.titleAfter?.trim() || '';
  const tagline =
    hero.description.trim() || 'Practice published MCQs for BCS, Bank, NTRCA, and government jobs.';
  const eyebrow = hero.eyebrow.trim() || 'BCS · Bank · NTRCA · Primary · Government Jobs';

  const primaryLabel = resolveCtaLabel(hero.primaryCta.label, 'Browse MCQ Bank');
  const primaryHref = resolveCtaHref(hero.primaryCta.href, '/preli-question-bank');
  const secondaryLabel = resolveCtaLabel(hero.secondaryCta.label, 'Written Question Bank');
  const secondaryHref = resolveCtaHref(hero.secondaryCta.href, '/written-question-bank');

  const mcqCount = liveStats?.questions;
  const collectionCount = liveStats?.questionSets;
  const hasLiveCounts = mcqCount != null || collectionCount != null;

  return (
    <section
      className={cn(
        // Horizontal clipping lives in `.hero-section` (globals.css) as overflow-x: clip —
        // `overflow-x-hidden` here turned the hero into a vertical scroll container on mobile.
        'hero-section relative isolate',
        'bg-[var(--bg)] text-[var(--ink)]',
      )}
      aria-labelledby="homepage-hero-heading"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="hero-mesh absolute inset-0" />
      </div>

      <div className="relative mx-auto grid w-full min-w-0 max-w-[var(--marketing-content-max)] items-center gap-8 px-3.5 py-9 sm:gap-11 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12 lg:px-8 lg:py-[4.5rem] xl:gap-16 xl:py-24">
        {/* Left — trust, value, action */}
        <HomepageHeroEntrance className="relative z-10 flex min-w-0 flex-col items-stretch gap-5 sm:gap-6 lg:items-start lg:pr-2">
          <div
            data-hp-hero
            className="inline-flex max-w-full items-start gap-2.5 self-start rounded-full border border-[var(--hp-panel-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),var(--bg-elevated))] px-3 py-1.5 shadow-[var(--hp-shadow)] backdrop-blur-sm sm:items-center sm:px-3.5"
          >
            <span className="relative mt-1.5 flex h-2 w-2 shrink-0 sm:mt-0" aria-hidden>
              <span className="hero-live-ping absolute inline-flex h-full w-full rounded-full bg-[var(--highlight)] opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--highlight)]" />
            </span>
            <p className="min-w-0 text-pretty break-words text-[0.72rem] leading-snug text-[var(--muted-strong)] sm:text-[0.8125rem]">
              {hasLiveCounts ? (
                <>
                  {mcqCount != null ? (
                    <>
                      <span className="font-semibold tabular-nums text-[var(--ink)]">
                        {formatCount(mcqCount)}
                      </span>
                      <span className="font-medium"> Published MCQs</span>
                    </>
                  ) : null}
                  {mcqCount != null && collectionCount != null ? (
                    <span className="text-[var(--muted)]"> · </span>
                  ) : null}
                  {collectionCount != null ? (
                    <>
                      <span className="font-semibold tabular-nums text-[var(--ink)]">
                        {formatCount(collectionCount)}
                      </span>
                      <span className="font-medium"> Collections</span>
                    </>
                  ) : null}
                </>
              ) : (
                <span className="text-pretty break-words font-medium">{eyebrow}</span>
              )}
            </p>
          </div>

          <div data-hp-hero className="w-full min-w-0 space-y-3.5">
            {hasLiveCounts && eyebrow ? (
              <p className="text-[0.8rem] font-medium tracking-[0.01em] text-[var(--muted)] text-pretty">
                {eyebrow}
              </p>
            ) : null}
            <h1
              id="homepage-hero-heading"
              className="font-display max-w-[15ch] text-[clamp(1.85rem,7.2vw,3.65rem)] leading-[1.05] font-bold tracking-tight text-balance"
            >
              <span className="block text-[var(--ink)]">{brand}</span>
              {highlight ? (
                <span className="mt-1.5 block max-w-[22ch] text-[clamp(1.15rem,2.9vw,1.7rem)] leading-snug font-semibold tracking-tight text-[var(--highlight)]">
                  {highlight}
                </span>
              ) : null}
              {!highlight && sideLabel ? (
                <span className="mt-2 block max-w-[22ch] text-[clamp(1rem,2.4vw,1.2rem)] leading-snug font-medium tracking-tight text-[var(--muted-strong)]">
                  {sideLabel}
                </span>
              ) : null}
            </h1>
            {highlight && sideLabel && sideLabel !== highlight ? (
              <p className="max-w-md text-sm font-medium text-[var(--muted-strong)]">{sideLabel}</p>
            ) : null}
            <p className="max-w-md text-[0.95rem] leading-relaxed text-pretty text-[var(--muted-strong)] sm:text-base line-clamp-3">
              {tagline}
            </p>
          </div>

          <div
            data-hp-hero
            className="flex w-full flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"
          >
            {hero.primaryCta.visible ? (
              <Link href={primaryHref} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="hero-cta-primary group h-12 w-full min-h-12 rounded-full px-7 text-[0.9375rem] font-semibold shadow-[0_10px_28px_-14px_rgba(227,30,36,0.4)] transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-14px_rgba(227,30,36,0.48)] active:translate-y-0 sm:w-auto sm:min-w-[12rem]"
                >
                  <span className="truncate">{primaryLabel}</span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-1"
                    aria-hidden
                  />
                </Button>
              </Link>
            ) : null}
            {hero.secondaryCta.visible ? (
              <Link href={secondaryHref} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-full min-h-12 rounded-full border-[var(--hp-panel-border)] bg-[var(--bg-elevated)] px-7 text-[0.9375rem] font-semibold text-[var(--ink)] shadow-[var(--shadow-sm)] transition-[transform,border-color,background-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--ink)_14%,var(--line))] hover:bg-[var(--bg)] hover:shadow-[var(--hp-shadow)] active:translate-y-0 sm:w-auto sm:min-w-[12rem]"
                >
                  <span className="truncate">{secondaryLabel}</span>
                </Button>
              </Link>
            ) : null}
          </div>

          <div data-hp-hero className="w-full space-y-2.5 pt-0.5">
            <p className="text-[0.68rem] font-semibold tracking-[0.11em] text-[var(--muted)] uppercase">
              {hero.quickLinksLabel?.trim() || 'Quick start'}
            </p>
            <ul className="flex flex-wrap gap-2" aria-label="Quick exam links">
              {(hero.quickLinks?.length ? hero.quickLinks : EXAM_PILLS).map((pill) => (
                <li key={`${pill.href}-${pill.label}`}>
                  <Link
                    href={pill.href}
                    className="inline-flex min-h-11 items-center rounded-full border border-[var(--hp-panel-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),var(--bg-elevated))] px-3.5 text-xs font-semibold text-[var(--ink-soft)] shadow-[var(--shadow-sm)] transition-[transform,border-color,color,background-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--highlight)_30%,var(--line))] hover:text-[var(--highlight)] hover:shadow-[var(--hp-shadow)] active:translate-y-0"
                  >
                    {pill.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </HomepageHeroEntrance>

        {/* Right — glow + tilted frames + auto-playing image slider */}
        <HomepageHeroEntrance className="relative flex w-full min-w-0 items-center justify-center overflow-x-clip bg-transparent lg:justify-end lg:pl-2">
          <HomepageHeroVisual primarySrc={heroImageUrl} />
        </HomepageHeroEntrance>
      </div>
    </section>
  );
}
