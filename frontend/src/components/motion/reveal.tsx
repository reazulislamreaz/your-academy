'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { loadScrollTrigger, prefersReducedMotion, YA_MOTION } from '@/lib/motion/gsap-client';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
  /** Delay before the reveal transition starts (ms). */
  delayMs?: number;
  /** Intersection root margin — kept for API compatibility; mapped to ScrollTrigger start. */
  rootMargin?: string;
  /** Animate only once (default). */
  once?: boolean;
};

/**
 * Viewport enter animation via GSAP ScrollTrigger (lazy-loaded).
 * Content stays visible without JS; respects prefers-reduced-motion.
 */
export function Reveal({
  children,
  className,
  delayMs = 0,
  once = true,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (prefersReducedMotion()) return;

    let cancelled = false;
    let revert: (() => void) | undefined;

    void (async () => {
      const { gsap } = await loadScrollTrigger();
      if (cancelled) return;

      const ctx = gsap.context(() => {
        gsap.fromTo(
          node,
          { opacity: YA_MOTION.fromOpacity, y: YA_MOTION.fromY },
          {
            opacity: 1,
            y: 0,
            duration: YA_MOTION.duration,
            delay: delayMs / 1000,
            ease: YA_MOTION.ease,
            clearProps: 'transform,opacity',
            scrollTrigger: {
              trigger: node,
              start: 'top 92%',
              once,
            },
          },
        );
      }, node);

      revert = () => ctx.revert();
    })();

    return () => {
      cancelled = true;
      revert?.();
    };
  }, [delayMs, once]);

  return (
    <div ref={ref} className={cn('gsap-reveal', className)} data-gsap-reveal="">
      {children}
    </div>
  );
}
