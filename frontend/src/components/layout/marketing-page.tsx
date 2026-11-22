'use client';

import type { ReactNode } from 'react';
import { GsapEntrance } from '@/components/motion/gsap-entrance';
import { cn } from '@/lib/utils';

/**
 * Shared content frame for marketing navbar routes.
 * Matches header/footer (`max-w-[1280px]`) so width stays stable across
 * empty, loading, and data-heavy pages. Soft GSAP entrance on mount.
 */
export function MarketingPage({
  children,
  className,
  density = 'default',
}: {
  children: ReactNode;
  className?: string;
  /** Vertical padding — bank lists use compact; news/written use default. */
  density?: 'default' | 'compact';
}) {
  return (
    <GsapEntrance
      y={10}
      duration={0.36}
      className={cn(
        'marketing-page mx-auto flex w-full min-w-0 max-w-[var(--marketing-content-max)] flex-1 flex-col',
        'px-4 sm:px-6',
        density === 'compact' ? 'py-6 sm:py-8' : 'py-8 sm:py-10',
        className,
      )}
    >
      {children}
    </GsapEntrance>
  );
}
