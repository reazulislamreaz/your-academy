import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, GraduationCap } from 'lucide-react';
import type { HomepagePayload } from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { HomepageIcon } from '@/lib/homepage-icon-map';

type Props = {
  hero: HomepagePayload['hero'];
  heroImageUrl?: string | null;
};

/**
 * Marketing hero — 100% CMS-driven (eyebrow, titles, description, CTAs, image).
 * Motion polish only; no hardcoded marketing copy on top of published payload values.
 */
export function HomepageHero({ hero, heroImageUrl }: Props) {
  if (!hero.visible) return null;

  const imageSrc = heroImageUrl?.trim() || '/images/hero-students.jpg';
  const brand = hero.titleBefore.trim() || 'Your Academy';
  const sideLabel = (hero.titleAfter?.trim() || hero.titleHighlight.trim()).trim();
  const tagline = hero.description.trim();

  return (
    <section className="hero-section relative overflow-x-hidden overflow-y-hidden bg-[var(--bg-inverse)] text-white">
      {/* Atmosphere — restrained navy/red washes + soft drifting orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="hero-atmosphere absolute inset-0" />
        <div className="hero-orb hero-orb-a absolute -top-20 left-[6%] h-52 w-52 rounded-full bg-[color-mix(in_srgb,var(--highlight)_18%,transparent)] blur-3xl sm:h-80 sm:w-80" />
        <div className="hero-orb hero-orb-b absolute right-[18%] top-[12%] hidden h-32 w-32 rounded-full bg-[#7eb6e8]/15 blur-3xl lg:block" />
        <div className="hero-orb hero-orb-c absolute bottom-0 left-0 h-44 w-44 rounded-full bg-[#1a4a8a]/35 blur-3xl sm:h-60 sm:w-60" />
        <div className="hero-grid absolute inset-0 opacity-[0.05] sm:opacity-[0.07]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent lg:hidden" />
      </div>

      <div className="relative mx-auto grid w-full min-w-0 max-w-[var(--marketing-content-max)] items-stretch lg:grid-cols-2">
        <div className="relative z-10 flex min-w-0 flex-col justify-center px-4 py-10 sm:px-8 sm:py-14 lg:min-h-[560px] lg:py-20 lg:pr-10 lg:pl-6 xl:pl-8">
          <div className="hero-enter mx-auto flex w-full min-w-0 max-w-xl flex-col items-center gap-5 sm:gap-7 lg:mx-0 lg:items-start lg:gap-8">
            {hero.eyebrow.trim() ? (
              <p className="hero-eyebrow inline-flex w-full max-w-full items-start gap-2.5 border border-white/18 bg-white/[0.09] px-3 py-2 text-left text-[0.75rem] leading-snug font-medium tracking-[0.01em] text-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_24px_-12px_rgba(0,0,0,0.35)] backdrop-blur-md transition-[transform,background-color,border-color] duration-300 ease-[var(--ease-luxury)] hover:border-white/28 hover:bg-white/[0.12] sm:w-auto sm:max-w-full sm:items-center sm:px-3.5 sm:text-[0.8125rem]">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--highlight)] text-white shadow-[0_4px_12px_-2px_rgba(227,30,36,0.55)] sm:mt-0 sm:h-7 sm:w-7">
                  <GraduationCap className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 text-pretty break-words">{hero.eyebrow.trim()}</span>
              </p>
            ) : null}

            <div className="w-full min-w-0">
              <div className="mx-auto flex w-full max-w-full flex-col items-center gap-2.5 sm:gap-3 lg:mx-0 lg:w-fit lg:items-stretch lg:gap-3.5">
                <h1 className="flex w-full max-w-full flex-col items-center gap-y-2 text-center sm:gap-y-2.5 md:flex-row md:flex-wrap md:items-center md:justify-center md:gap-x-4 md:gap-y-2 lg:w-auto lg:flex-nowrap lg:justify-start lg:gap-x-5 lg:text-left">
                  <span className="font-display max-w-full text-[clamp(1.85rem,7.5vw,4.15rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-balance text-white drop-shadow-[0_1px_0_rgba(255,255,255,0.08)]">
                    {brand}
                  </span>
                  {sideLabel ? (
                    <span className="relative max-w-[16rem] text-[clamp(0.8rem,2.4vw,1.0625rem)] leading-snug font-medium tracking-[0.02em] text-pretty text-white/72 md:max-w-[12.5rem] md:border-l md:border-white/25 md:pl-3.5 md:text-left lg:max-w-[15.5rem] lg:pl-4">
                      {sideLabel}
                    </span>
                  ) : null}
                </h1>
                {tagline ? (
                  <p className="relative text-center font-display text-[clamp(1rem,3.2vw,1.5rem)] leading-snug font-semibold tracking-[0.015em] text-white lg:text-left">
                    <span className="relative inline-block max-w-full px-1 pb-1.5">
                      {tagline}
                      <span
                        aria-hidden
                        className="hero-tagline-underline absolute inset-x-3 -bottom-0.5 h-[3px] rounded-full bg-[var(--highlight)] sm:inset-x-2"
                      />
                    </span>
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex w-full max-w-md flex-col gap-2.5 sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3 lg:justify-start">
              {hero.primaryCta.visible ? (
                <Link href={hero.primaryCta.href} className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="hero-cta-primary group w-full rounded-full px-6 text-[0.9rem] shadow-[0_10px_28px_-8px_rgba(227,30,36,0.55)] transition-[transform,box-shadow] duration-300 ease-[var(--ease-luxury)] hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-10px_rgba(227,30,36,0.7)] active:translate-y-0 sm:w-auto sm:px-8 sm:text-[0.95rem]"
                  >
                    {hero.primaryCta.label}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[var(--ease-luxury)] group-hover:translate-x-0.5" />
                  </Button>
                </Link>
              ) : null}
              {hero.secondaryCta.visible ? (
                <Link href={hero.secondaryCta.href} className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full rounded-full border-white/40 bg-white/5 px-6 text-[0.9rem] text-white backdrop-blur-sm transition-[transform,background-color,border-color,box-shadow] duration-300 ease-[var(--ease-luxury)] hover:-translate-y-0.5 hover:border-white/70 hover:bg-white/12 hover:shadow-[0_10px_28px_-14px_rgba(255,255,255,0.45)] active:translate-y-0 sm:w-auto sm:px-8 sm:text-[0.95rem]"
                  >
                    {hero.secondaryCta.label}
                  </Button>
                </Link>
              ) : null}
            </div>

            {hero.stats.length > 0 ? (
              <dl className="hero-stats mt-0 grid w-full min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:gap-0">
                {hero.stats.map((stat, i) => (
                  <div
                    key={`${stat.label}-${i}`}
                    className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2.5 backdrop-blur-sm transition-[transform,background-color,border-color] duration-300 ease-[var(--ease-luxury)] hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.1] sm:px-3.5 sm:py-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none lg:hover:translate-y-0 lg:hover:bg-transparent"
                  >
                    {i > 0 ? (
                      <span
                        className="mr-3 hidden h-10 w-px bg-gradient-to-b from-transparent via-white/30 to-transparent lg:block"
                        aria-hidden
                      />
                    ) : null}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition-transform duration-300 ease-[var(--ease-luxury)] sm:h-10 sm:w-10">
                      <HomepageIcon iconKey={stat.iconKey} className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <dt className="sr-only">{stat.label}</dt>
                      <dd className="font-display text-lg leading-none font-bold tracking-tight sm:text-xl lg:text-[1.35rem]">
                        {stat.value}
                      </dd>
                      <dd className="mt-1 text-xs leading-snug text-pretty text-white/70 sm:text-sm">
                        {stat.label}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </div>

        <div className="hero-visual-enter relative min-h-[220px] w-full min-w-0 sm:min-h-[300px] lg:min-h-full">
          <div className="hero-photo-mask absolute inset-0 overflow-hidden">
            <Image
              src={imageSrc}
              alt="Students studying together outdoors"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="hero-photo object-cover object-[center_28%]"
              unoptimized={imageSrc.startsWith('http')}
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-[var(--bg-inverse)]/60 via-transparent to-transparent lg:bg-gradient-to-l lg:from-transparent lg:via-transparent lg:to-[var(--bg-inverse)]/25"
            />
          </div>
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden h-full w-[4.75rem] -translate-x-1/2 lg:block"
            viewBox="0 0 72 640"
            preserveAspectRatio="none"
          >
            <path
              d="M40 0C12 130 8 250 34 360C56 450 54 540 36 640H22C40 540 42 450 20 360C-6 250-2 130 26 0H40Z"
              fill="var(--highlight)"
            />
            <path
              d="M52 0C24 130 20 250 46 360C68 450 66 540 48 640H40C58 540 60 450 38 360C12 250 16 130 44 0H52Z"
              fill="#a8d0f0"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
