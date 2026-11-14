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

export function HomepageHero({ hero, heroImageUrl }: Props) {
  if (!hero.visible) return null;

  const imageSrc = heroImageUrl?.trim() || '/images/hero-students.jpg';

  return (
    <section className="relative overflow-hidden bg-[var(--bg-inverse)] text-white">
      <div className="relative mx-auto grid w-full max-w-[1280px] items-stretch lg:grid-cols-2">
        <div className="motion-rise relative z-10 space-y-6 px-4 py-12 sm:px-8 sm:py-14 lg:py-16 lg:pr-8 lg:pl-6 xl:pl-8">
          <p className="inline-flex items-center gap-2 rounded-full bg-[#5b6b80]/45 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm">
            <GraduationCap className="h-4 w-4 shrink-0 text-white" aria-hidden />
            {hero.eyebrow}
          </p>
          <h1 className="font-display text-[clamp(1.85rem,5vw,3.75rem)] font-bold text-balance">
            {hero.titleBefore}{' '}
            <span className="relative inline-block text-[var(--highlight)]">
              {hero.titleHighlight}
              <svg
                aria-hidden
                viewBox="0 0 120 12"
                className="absolute -bottom-1 left-0 w-full"
                fill="none"
              >
                <path
                  d="M2 9 Q 30 2 60 7 Q 90 12 118 5"
                  stroke="var(--highlight)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            {hero.titleAfter ? ` ${hero.titleAfter}` : null}
          </h1>
          <p className="max-w-md text-base leading-relaxed text-white/75 sm:text-lg">
            {hero.description}
          </p>
          <div className="flex w-full max-w-md flex-col gap-3 pt-1 sm:max-w-none sm:flex-row sm:flex-wrap">
            {hero.primaryCta.visible ? (
              <Link href={hero.primaryCta.href} className="w-full sm:w-auto">
                <Button size="lg" className="w-full rounded-full px-7 shadow-md sm:w-auto">
                  {hero.primaryCta.label}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : null}
            {hero.secondaryCta.visible ? (
              <Link href={hero.secondaryCta.href} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full rounded-full border-white/55 bg-transparent px-7 text-white hover:border-white hover:bg-white/10 sm:w-auto"
                >
                  {hero.secondaryCta.label}
                </Button>
              </Link>
            ) : null}
          </div>
          {hero.stats.length > 0 ? (
            <dl className="flex flex-wrap items-center gap-x-0 gap-y-4 pt-4">
              {hero.stats.map((stat, i) => (
                <div key={`${stat.label}-${i}`} className="flex items-center">
                  {i > 0 ? (
                    <span className="mx-4 hidden h-8 w-px bg-white/25 sm:block" aria-hidden />
                  ) : null}
                  <div className="flex items-center gap-3 pr-2 sm:pr-0">
                    <HomepageIcon iconKey={stat.iconKey} className="h-6 w-6 text-white/85" />
                    <div>
                      <dt className="sr-only">{stat.label}</dt>
                      <dd className="font-display text-lg leading-none font-bold sm:text-xl">
                        {stat.value}
                      </dd>
                      <dd className="mt-1 text-xs text-white/85 sm:text-sm">{stat.label}</dd>
                    </div>
                  </div>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        <div
          className="motion-rise relative min-h-[280px] sm:min-h-[360px] lg:min-h-full"
          style={{ animationDelay: '90ms' }}
        >
          <div className="hero-photo-mask absolute inset-0 overflow-hidden">
            <Image
              src={imageSrc}
              alt="Students studying together outdoors"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-[center_30%]"
              unoptimized={imageSrc.startsWith('http')}
            />
          </div>
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden h-full w-[4.5rem] -translate-x-1/2 lg:block"
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
