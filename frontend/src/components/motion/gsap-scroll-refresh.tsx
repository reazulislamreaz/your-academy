'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { loadScrollTrigger, prefersReducedMotion } from '@/lib/motion/gsap-client';

/**
 * Refresh ScrollTrigger after App Router navigations so measurements stay correct.
 * No-op when reduced-motion is preferred (no ScrollTriggers registered).
 */
export function GsapScrollRefresh() {
  const pathname = usePathname();

  useEffect(() => {
    if (prefersReducedMotion()) return;

    let cancelled = false;
    void (async () => {
      const { ScrollTrigger } = await loadScrollTrigger();
      if (cancelled) return;
      // Defer to next frame so layout after route paint is settled.
      requestAnimationFrame(() => {
        if (!cancelled) ScrollTrigger.refresh();
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
