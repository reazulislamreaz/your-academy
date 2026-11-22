'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { loadGsap, prefersReducedMotion, YA_MOTION } from '@/lib/motion/gsap-client';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
  /** Extra class applied to the animated shell (default motion-page for CSS fallback). */
  motionClassName?: string;
};

/**
 * Re-triggers a short enter animation on client navigations within a layout.
 * Prefers GSAP (transform/opacity); falls back to CSS `.motion-page` before hydrate.
 */
export function PageShell({ children, className, motionClassName = 'motion-page' }: Props) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion()) return;
    // Immersive routes pass motionClassName="" — skip GSAP so fixed viewers stay stable.
    if (!motionClassName) return;

    let cancelled = false;
    let revert: (() => void) | undefined;

    void (async () => {
      const gsap = await loadGsap();
      if (cancelled || !ref.current) return;

      const ctx = gsap.context(() => {
        gsap.fromTo(
          node,
          { opacity: YA_MOTION.fromOpacity, y: YA_MOTION.pageY },
          {
            opacity: 1,
            y: 0,
            duration: YA_MOTION.pageDuration,
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
  }, [pathname, motionClassName]);

  return (
    <div
      key={pathname}
      ref={ref}
      className={cn('min-w-0', motionClassName, className)}
      data-gsap-page=""
    >
      {children}
    </div>
  );
}
