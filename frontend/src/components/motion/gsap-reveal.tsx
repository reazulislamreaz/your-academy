'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { loadScrollTrigger, prefersReducedMotion, YA_MOTION } from '@/lib/motion/gsap-client';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
  /** Seconds before the tween starts once triggered. */
  delay?: number;
  /** When true, animate `[data-gsap-stagger]` children (or direct children). */
  staggerChildren?: boolean;
  /** Pixel rise distance (transform only). */
  y?: number;
  /** ScrollTrigger start position. */
  start?: string;
  /** Marker attribute for staggered children (default data-gsap-stagger). */
  staggerSelector?: string;
};

/**
 * Scroll-triggered section reveal — content stays visible without JS.
 * GSAP loads on demand; timelines revert on unmount.
 */
export function GsapReveal({
  children,
  className,
  delay = 0,
  staggerChildren = false,
  y = YA_MOTION.fromY,
  start = 'top 90%',
  staggerSelector = '[data-gsap-stagger]',
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion()) return;

    let cancelled = false;
    let revert: (() => void) | undefined;

    void (async () => {
      const { gsap } = await loadScrollTrigger();
      if (cancelled) return;

      const ctx = gsap.context(() => {
        if (staggerChildren) {
          const items = node.querySelectorAll(staggerSelector);
          const targets = items.length > 0 ? items : Array.from(node.children);
          if (targets.length === 0) return;
          gsap.fromTo(
            targets,
            { opacity: YA_MOTION.fromOpacity, y },
            {
              opacity: 1,
              y: 0,
              duration: YA_MOTION.duration,
              delay,
              stagger: YA_MOTION.stagger,
              ease: YA_MOTION.ease,
              clearProps: 'transform,opacity',
              scrollTrigger: { trigger: node, start, once: true },
            },
          );
        } else {
          gsap.fromTo(
            node,
            { opacity: YA_MOTION.fromOpacity, y },
            {
              opacity: 1,
              y: 0,
              duration: YA_MOTION.duration,
              delay,
              ease: YA_MOTION.ease,
              clearProps: 'transform,opacity',
              scrollTrigger: { trigger: node, start, once: true },
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
  }, [delay, staggerChildren, y, start, staggerSelector]);

  return (
    <div
      ref={ref}
      className={cn(!staggerChildren && 'gsap-reveal', className)}
      data-gsap-reveal=""
    >
      {children}
    </div>
  );
}
