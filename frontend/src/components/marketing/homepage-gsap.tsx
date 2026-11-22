'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  staggerChildren?: boolean;
  y?: number;
};

/**
 * Homepage scroll reveal — transform-first (content stays visible without JS).
 * GSAP is loaded on demand so it stays out of the critical path.
 */
export function HomepageReveal({
  children,
  className,
  delay = 0,
  staggerChildren = false,
  y = 12,
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (prefersReducedMotion()) return;

    let cancelled = false;
    let revert: (() => void) | undefined;

    void (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
        if (staggerChildren) {
          const items = node.querySelectorAll('[data-hp-stagger]');
          const targets = items.length > 0 ? items : node.children;
          // Keep opacity ≥ 0.92 so LCP/no-JS and slow networks never show blank sections.
          gsap.fromTo(
            targets,
            { opacity: 0.92, y },
            {
              opacity: 1,
              y: 0,
              duration: 0.42,
              delay,
              stagger: 0.04,
              ease: 'power3.out',
              clearProps: 'transform,opacity',
              scrollTrigger: {
                trigger: node,
                start: 'top 90%',
                once: true,
              },
            },
          );
        } else {
          gsap.fromTo(
            node,
            { opacity: 0.92, y },
            {
              opacity: 1,
              y: 0,
              duration: 0.45,
              delay,
              ease: 'power3.out',
              clearProps: 'transform,opacity',
              scrollTrigger: {
                trigger: node,
                start: 'top 90%',
                once: true,
              },
            },
          );
        }
      }, node);

      revert = () => ctx.revert();
    })();

    return () => {
      cancelled = true;
      revert?.();
    };
  }, [delay, staggerChildren, y]);

  return (
    <div ref={ref} className={cn(!staggerChildren && 'homepage-gsap-reveal', className)}>
      {children}
    </div>
  );
}

type CountUpProps = {
  value: number;
  className?: string;
  locale?: string;
  duration?: number;
};

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
    if (!node) return;

    if (prefersReducedMotion() || target === 0) {
      node.textContent = label;
      return;
    }

    let cancelled = false;
    let revert: (() => void) | undefined;

    void (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (cancelled || !ref.current) return;
      gsap.registerPlugin(ScrollTrigger);

      const state = { n: 0 };
      const ctx = gsap.context(() => {
        gsap.to(state, {
          n: target,
          duration,
          ease: 'power2.out',
          onUpdate: () => {
            if (ref.current) {
              ref.current.textContent = new Intl.NumberFormat(locale).format(
                Math.round(state.n),
              );
            }
          },
          onStart: () => {
            // Reset only when the scroll-triggered animation actually begins.
            if (ref.current) ref.current.textContent = '0';
          },
          scrollTrigger: {
            trigger: node,
            start: 'top 92%',
            once: true,
          },
        });
      }, node);

      revert = () => ctx.revert();
    })();

    return () => {
      cancelled = true;
      revert?.();
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
 * LCP-safe hero entrance: content is fully visible without JS.
 * Animates transform only (never opacity 0) so LCP text/image stay paint-ready.
 */
export function HomepageHeroEntrance({ children, className }: HeroEntranceProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (prefersReducedMotion()) return;

    const items = node.querySelectorAll('[data-hp-hero]');
    if (items.length === 0) return;

    let cancelled = false;
    let revert: (() => void) | undefined;

    void (async () => {
      const { default: gsap } = await import('gsap');
      if (cancelled) return;

      const ctx = gsap.context(() => {
        gsap.fromTo(
          items,
          { y: 10 },
          {
            y: 0,
            duration: 0.4,
            stagger: 0.04,
            ease: 'power3.out',
            clearProps: 'transform',
          },
        );
      }, node);

      revert = () => ctx.revert();
    })();

    return () => {
      cancelled = true;
      revert?.();
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
