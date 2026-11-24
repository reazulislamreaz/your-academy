'use client';

import Image from 'next/image';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { cn } from '@/lib/utils';

export type HeroSlide = {
  src: string;
  alt: string;
};

/**
 * Hero right-visual slides — every `src` must be unique (3 photos).
 * Files live in `frontend/public/images/`:
 *   hero-1.avif — campus / lecture photo
 *   hero-2.webp — study group
 *   hero-3.webp — Picture1
 * Prefer ≥1200px on the long edge for sharp retina display.
 */
export const HERO_SLIDES: HeroSlide[] = [
  {
    src: '/images/hero-1.avif',
    alt: 'Students preparing for exams with Your Academy',
  },
  {
    src: '/images/hero-2.webp',
    alt: 'Multiethnic group of young people studying together',
  },
  {
    src: '/images/hero-3.webp',
    alt: 'Students gathering on campus for exam preparation',
  },
];

const INTERVAL_MS = 4000;
const SWIPE_THRESHOLD_PX = 48;
/**
 * Hero media must stay at full authored quality (no recompression).
 * Request ~2× of the framed card on large screens; full viewport width on smaller
 * devices so retina phones still decode a sharp source.
 */
const SIZES = '(min-width: 1024px) 880px, 100vw';
/** Next Image max — used when optimization runs; local/CMS heroes use `unoptimized`. */
const IMAGE_QUALITY = 100;

type Props = {
  /** CMS hero image — becomes the first slide when provided (deduped). */
  primarySrc?: string | null;
};

function buildSlides(primarySrc?: string | null): HeroSlide[] {
  const trimmed = primarySrc?.trim() || '';
  const base = HERO_SLIDES.filter(
    (slide, i, arr) => arr.findIndex((s) => s.src === slide.src) === i,
  );

  if (!trimmed) return base;

  const rest = base.filter((s) => s.src !== trimmed);
  return [
    {
      src: trimmed,
      alt: 'Students preparing for exams with Your Academy',
    },
    ...rest,
  ];
}

export function HomepageHeroVisual({ primarySrc }: Props) {
  const slides = useMemo(() => buildSlides(primarySrc), [primarySrc]);
  const [index, setIndex] = useState(0);
  const [frameNudge, setFrameNudge] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const pausedRef = useRef(false);
  const hiddenRef = useRef(false);
  const nudgeTimerRef = useRef<number | null>(null);
  const pointerStartX = useRef<number | null>(null);

  const count = slides.length;
  const safeIndex = count > 0 ? ((index % count) + count) % count : 0;

  const nudgeFrame = useCallback(() => {
    if (nudgeTimerRef.current != null) window.clearTimeout(nudgeTimerRef.current);
    setFrameNudge(true);
    nudgeTimerRef.current = window.setTimeout(() => {
      setFrameNudge(false);
      nudgeTimerRef.current = null;
    }, 600);
  }, []);

  const goTo = useCallback(
    (next: number) => {
      if (count < 1) return;
      setIndex(((next % count) + count) % count);
      nudgeFrame();
    },
    [count, nudgeFrame],
  );

  const goNext = useCallback(() => goTo(safeIndex + 1), [goTo, safeIndex]);
  const goPrev = useCallback(() => goTo(safeIndex - 1), [goTo, safeIndex]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      hiddenRef.current = document.visibilityState === 'hidden';
    };
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (reduceMotion || count < 2) return;
    const id = window.setInterval(() => {
      if (pausedRef.current || hiddenRef.current) return;
      setIndex((i) => (i + 1) % count);
      nudgeFrame();
    }, INTERVAL_MS);
    return () => {
      window.clearInterval(id);
      if (nudgeTimerRef.current != null) window.clearTimeout(nudgeTimerRef.current);
    };
  }, [count, reduceMotion, nudgeFrame]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointerStartX.current = e.clientX;
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointerStartX.current;
    pointerStartX.current = null;
    if (start == null) return;
    const delta = e.clientX - start;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    if (delta < 0) goNext();
    else goPrev();
  };

  return (
    <div
      data-hp-hero
      className="relative isolate mx-auto w-full max-w-[min(100%,340px)] overflow-x-clip bg-transparent lg:max-w-[min(100%,440px)] lg:justify-self-end"
    >
      {/* Fixed aspect box — reserves space, no pale panel chrome */}
      <div className="relative mx-auto aspect-[1/1.05] w-full bg-transparent">
        {/* LAYER 1 — soft brand glow */}
        <div
          aria-hidden
          className="hero-visual-glow pointer-events-none absolute top-1/2 left-1/2 z-0 size-[130%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,32,80,0.18)_0%,rgba(227,30,36,0.10)_45%,transparent_70%)]"
        />

        {/* LAYER 2 — tilted outline frames (static) */}
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 z-[1] rounded-[44px] border-[1.5px] border-[rgba(0,32,80,0.35)] bg-transparent transition-transform duration-[600ms] ease-in-out',
            'translate-x-2 -translate-y-1.5 sm:translate-x-2.5 sm:-translate-y-2 lg:translate-x-3.5 lg:-translate-y-2.5',
            frameNudge ? 'rotate-[14deg]' : 'rotate-12',
          )}
        />
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 z-[1] rounded-[44px] border-[1.5px] border-[rgba(227,30,36,0.25)] bg-transparent transition-transform duration-[600ms] ease-in-out',
            '-translate-x-1.5 translate-y-1 sm:-translate-x-2 sm:translate-y-1.5',
            frameNudge ? '-rotate-[8deg]' : '-rotate-6',
          )}
        />

        {/* LAYER 3 — image card (slider only) */}
        <div
          role="region"
          aria-roledescription="carousel"
          aria-label="Hero image slider"
          className="absolute inset-0 z-[2] -rotate-[2deg]"
          onMouseEnter={() => {
            pausedRef.current = true;
          }}
          onMouseLeave={() => {
            pausedRef.current = false;
          }}
          onFocusCapture={() => {
            pausedRef.current = true;
          }}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              pausedRef.current = false;
            }
          }}
        >
          <figure className="relative m-0 size-full bg-transparent">
            <div
              className="relative size-full overflow-hidden rounded-[44px] bg-transparent shadow-[0_30px_70px_-20px_rgba(0,32,80,0.35)]"
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={() => {
                pointerStartX.current = null;
              }}
            >
              {slides.map((slide, i) => {
                const active = i === safeIndex;
                return (
                  <div
                    key={slide.src}
                    className={cn(
                      'absolute inset-0',
                      reduceMotion
                        ? active
                          ? 'opacity-100'
                          : 'pointer-events-none opacity-0'
                        : cn(
                            'transition-[opacity,transform] duration-700 ease-in-out',
                            active
                              ? 'z-[1] scale-100 opacity-100'
                              : 'z-0 scale-[1.06] opacity-0',
                          ),
                    )}
                    aria-hidden={!active}
                  >
                    <Image
                      src={slide.src}
                      alt={active ? slide.alt : ''}
                      fill
                      priority={i === 0}
                      fetchPriority={i === 0 ? 'high' : 'auto'}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      sizes={SIZES}
                      quality={IMAGE_QUALITY}
                      // Serve original AVIF/WebP / CMS bytes — never re-encode or down-quality the hero.
                      unoptimized
                      className="object-cover object-center"
                      draggable={false}
                    />
                  </div>
                );
              })}

              {count > 1 ? (
                <div
                  className="absolute inset-x-0 bottom-0 z-[2] flex justify-center bg-gradient-to-t from-black/30 to-transparent px-3 pt-10 pb-3.5"
                  role="tablist"
                  aria-label="Hero slides"
                >
                  <div className="flex items-center gap-1.5">
                    {slides.map((slide, i) => {
                      const active = i === safeIndex;
                      return (
                        <button
                          key={`dot-${slide.src}`}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          aria-label={`Show slide ${i + 1}: ${slide.alt}`}
                          className={cn(
                            // Visual dot stays small; hit area meets WCAG 2.5.8 (≥24×24, prefer 44).
                            'flex min-h-11 min-w-11 items-center justify-center rounded-full',
                          )}
                          onClick={() => goTo(i)}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              'rounded-full transition-[width,background-color] duration-300 ease-out',
                              active ? 'h-2 w-6 bg-white' : 'size-2 bg-white/50 hover:bg-white/75',
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
            <figcaption className="sr-only">
              Collaborative study session for exam preparation
            </figcaption>
          </figure>
        </div>
      </div>
    </div>
  );
}
