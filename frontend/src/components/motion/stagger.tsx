'use client';

import {
  useEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { loadScrollTrigger, prefersReducedMotion, YA_MOTION } from '@/lib/motion/gsap-client';
import { cn } from '@/lib/utils';

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  /** Delay between each child enter (ms). */
  stepMs?: number;
};

/**
 * Staggered enter for dashboard cards / lists via GSAP ScrollTrigger (lazy-loaded).
 * Falls back to static layout when reduced-motion is preferred.
 */
export function Stagger({
  children,
  className,
  stepMs = 55,
  ...props
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

      const targets = Array.from(node.children);
      if (targets.length === 0) return;

      const ctx = gsap.context(() => {
        gsap.fromTo(
          targets,
          { opacity: YA_MOTION.fromOpacity, y: 10 },
          {
            opacity: 1,
            y: 0,
            duration: YA_MOTION.duration,
            stagger: Math.max(0.03, stepMs / 1000),
            ease: YA_MOTION.ease,
            clearProps: 'transform,opacity',
            scrollTrigger: {
              trigger: node,
              start: 'top 94%',
              once: true,
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
  }, [stepMs]);

  return (
    <div
      ref={ref}
      className={cn('gsap-stagger', className)}
      data-gsap-stagger-root=""
      {...props}
    >
      {children}
    </div>
  );
}
