'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { GsapReveal } from '@/components/motion/gsap-reveal';
import {
  loadGsap,
  loadScrollTrigger,
  prefersReducedMotion,
  YA_MOTION,
} from '@/lib/motion/gsap-client';
import { cn } from '@/lib/utils';

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  staggerChildren?: boolean;
  y?: number;
};

/**
 * Homepage scroll reveal — thin wrapper over shared GsapReveal.
 * Keeps `data-hp-stagger` for existing homepage section markup.
 */
export function HomepageReveal({
  children,
  className,
  delay = 0,
  staggerChildren = false,
  y = YA_MOTION.fromY,
}: RevealProps) {
  return (
    <GsapReveal
      className={cn(className)}
      delay={delay}
      staggerChildren={staggerChildren}
      y={y}
      staggerSelector="[data-hp-stagger]"
    >
      {children}
    </GsapReveal>
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
      const { gsap } = await loadScrollTrigger();
      if (cancelled || !ref.current) return;

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
      const gsap = await loadGsap();
      if (cancelled) return;

      const ctx = gsap.context(() => {
        gsap.fromTo(
          items,
          { y: YA_MOTION.heroY },
          {
            y: 0,
            duration: 0.4,
            stagger: YA_MOTION.stagger,
            ease: YA_MOTION.ease,
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
