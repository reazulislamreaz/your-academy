'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/*
 * Homepage motion primitives — IntersectionObserver + CSS transitions only
 * (no scroll listeners, no GSAP on the homepage critical path).
 * Styles live in `src/styles/homepage-polish.css` (`.hp-rv*`, `.hp-hero-entrance`).
 *
 * Content is always server-rendered visible. The hidden start state is applied
 * by JS only to elements that are still below the fold, so no-JS visitors,
 * crawlers and above-the-fold (LCP) content are never hidden.
 */

const REVEAL_STAGGER_MS = 55;
const REVEAL_MAX_STAGGER_STEPS = 8;
const REVEAL_SETTLE_MS = 760;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Seconds before the reveal starts once in view. */
  delay?: number;
  /** Reveal `[data-hp-stagger]` descendants one after another. */
  staggerChildren?: boolean;
  /** Rise distance in px (transform only). */
  y?: number;
};

/** One-shot scroll reveal for homepage sections. */
export function HomepageReveal({
  children,
  className,
  delay = 0,
  staggerChildren = false,
  y = 14,
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;

    // Already on screen (or scrolled past, e.g. deep link) — never hide it.
    if (node.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    const staggered = staggerChildren
      ? Array.from(node.querySelectorAll<HTMLElement>('[data-hp-stagger]'))
      : [];
    const targets = staggered.length > 0 ? staggered : [node];

    targets.forEach((el, i) => {
      const step = Math.min(i, REVEAL_MAX_STAGGER_STEPS);
      el.style.setProperty('--hp-rv-delay', `${Math.round(delay * 1000) + step * REVEAL_STAGGER_MS}ms`);
      el.style.setProperty('--hp-rv-y', `${y}px`);
      el.classList.add('hp-rv');
    });

    let settleTimer: number | undefined;
    const cleanup = () => {
      targets.forEach((el) => {
        el.classList.remove('hp-rv', 'hp-rv-in');
        el.style.removeProperty('--hp-rv-delay');
        el.style.removeProperty('--hp-rv-y');
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        targets.forEach((el) => el.classList.add('hp-rv-in'));
        // Drop reveal classes afterwards so card hover transitions are not delayed.
        const longest =
          Math.round(delay * 1000) +
          Math.min(targets.length - 1, REVEAL_MAX_STAGGER_STEPS) * REVEAL_STAGGER_MS;
        settleTimer = window.setTimeout(cleanup, longest + REVEAL_SETTLE_MS);
      },
      { rootMargin: '0px 0px -6% 0px' },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      if (settleTimer) window.clearTimeout(settleTimer);
      cleanup();
    };
  }, [delay, staggerChildren, y]);

  return (
    <div ref={ref} className={cn(className)} data-hp-reveal="">
      {children}
    </div>
  );
}

type CountUpProps = {
  value: number;
  className?: string;
  locale?: string;
  /** Seconds. */
  duration?: number;
};

/** Counts an existing (API) number up from 0 the first time it scrolls into view. */
export function HomepageCountUp({
  value,
  className,
  locale = 'en-BD',
  duration = 0.9,
}: CountUpProps) {
  const target = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  const ref = useRef<HTMLSpanElement | null>(null);
  const label = new Intl.NumberFormat(locale).format(target);

  useEffect(() => {
    const node = ref.current;
    if (!node || target === 0) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;

    // Only count numbers that start below the fold; visible-at-load stats stay static
    // so they never flash from the SSR value back to zero.
    if (node.getBoundingClientRect().top < window.innerHeight) return;

    const format = new Intl.NumberFormat(locale);
    let frame = 0;

    // Keep the real value in the DOM (crawlers, never-scrolled renders) and only
    // zero it just before it scrolls into view, so the reset is never seen.
    const prime = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        prime.disconnect();
        node.textContent = format.format(0);
      },
      { rootMargin: '0px 0px 12% 0px' },
    );
    prime.observe(node);

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        prime.disconnect();
        const start = performance.now();
        const total = duration * 1000;
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / total);
          const eased = 1 - Math.pow(1 - t, 3);
          node.textContent = format.format(Math.round(target * eased));
          if (t < 1) frame = window.requestAnimationFrame(tick);
        };
        frame = window.requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    observer.observe(node);

    return () => {
      prime.disconnect();
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      node.textContent = label;
    };
  }, [duration, label, locale, target]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)} aria-label={label}>
      {label}
    </span>
  );
}

type HeroEntranceProps = {
  children: ReactNode;
  className?: string;
};

/**
 * LCP-safe hero entrance: a CSS transform-only rise on `[data-hp-hero]` children.
 * Never touches opacity, so text/image paint immediately (with or without JS).
 */
export function HomepageHeroEntrance({ children, className }: HeroEntranceProps) {
  return <div className={cn('hp-hero-entrance', className)}>{children}</div>;
}
