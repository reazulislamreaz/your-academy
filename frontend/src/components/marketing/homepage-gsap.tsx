'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger);

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
 * Homepage scroll reveal — opacity/transform only, once, reduced-motion aware.
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

    if (prefersReducedMotion()) {
      gsap.set(node, { clearProps: 'all', opacity: 1, y: 0 });
      node.querySelectorAll('[data-hp-stagger]').forEach((el) => {
        gsap.set(el, { clearProps: 'all', opacity: 1, y: 0 });
      });
      return;
    }

    const ctx = gsap.context(() => {
      if (staggerChildren) {
        const items = node.querySelectorAll('[data-hp-stagger]');
        const targets = items.length > 0 ? items : node.children;
        gsap.set(targets, { opacity: 0, y });
        gsap.to(targets, {
          opacity: 1,
          y: 0,
          duration: 0.42,
          delay,
          stagger: 0.04,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: node,
            start: 'top 90%',
            once: true,
          },
        });
      } else {
        gsap.fromTo(
          node,
          { opacity: 0, y },
          {
            opacity: 1,
            y: 0,
            duration: 0.45,
            delay,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: node,
              start: 'top 90%',
              once: true,
            },
          },
        );
      }
    }, node);

    return () => ctx.revert();
  }, [delay, staggerChildren, y]);

  return (
    <div
      ref={ref}
      className={cn(!staggerChildren && 'homepage-gsap-reveal', className)}
    >
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

    const state = { n: 0 };
    const ctx = gsap.context(() => {
      gsap.to(state, {
        n: target,
        duration,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: node,
          start: 'top 92%',
          once: true,
        },
        onUpdate: () => {
          node.textContent = new Intl.NumberFormat(locale).format(Math.round(state.n));
        },
        onComplete: () => {
          node.textContent = label;
        },
      });
    }, node);

    return () => ctx.revert();
  }, [duration, label, locale, target]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)} aria-label={label}>
      0
    </span>
  );
}

type HeroEntranceProps = {
  children: ReactNode;
  className?: string;
};

/** Fast LCP-safe hero entrance (fromTo, &lt;0.5s). */
export function HomepageHeroEntrance({ children, className }: HeroEntranceProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (prefersReducedMotion()) {
      gsap.set(node.querySelectorAll('[data-hp-hero]'), { clearProps: 'all', opacity: 1, y: 0 });
      return;
    }

    const items = node.querySelectorAll('[data-hp-hero]');
    if (items.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        items,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.04,
          ease: 'power3.out',
          clearProps: 'transform',
        },
      );
    }, node);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
