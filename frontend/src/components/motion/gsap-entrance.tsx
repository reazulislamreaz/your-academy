'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { loadGsap, prefersReducedMotion, YA_MOTION } from '@/lib/motion/gsap-client';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
  /** Query for staggered children; when omitted, animates the wrapper. */
  childSelector?: string;
  delay?: number;
  y?: number;
  duration?: number;
};

/**
 * One-shot mount entrance for chrome (nav, page headers). Transform-first; LCP-safe.
 */
export function GsapEntrance({
  children,
  className,
  childSelector,
  delay = 0,
  y = YA_MOTION.heroY,
  duration = YA_MOTION.duration,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion()) return;

    let cancelled = false;
    let revert: (() => void) | undefined;

    void (async () => {
      const gsap = await loadGsap();
      if (cancelled) return;

      const targets = childSelector
        ? node.querySelectorAll(childSelector)
        : [node];
      if (targets.length === 0) return;

      const ctx = gsap.context(() => {
        gsap.fromTo(
          targets,
          { y, opacity: YA_MOTION.fromOpacity },
          {
            y: 0,
            opacity: 1,
            duration,
            delay,
            stagger: childSelector ? YA_MOTION.stagger : 0,
            ease: YA_MOTION.ease,
            clearProps: 'transform,opacity',
          },
        );
      }, node);

      revert = () => ctx.revert();
    })();

    return () => {
      cancelled = true;
      revert?.();
    };
  }, [childSelector, delay, y, duration]);

  return (
    <div ref={ref} className={cn(className)} data-gsap-entrance="">
      {children}
    </div>
  );
}
