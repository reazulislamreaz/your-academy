'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { PageShell } from '@/components/motion/page-shell';
import { cn } from '@/lib/utils';

/** Routes that need edge-to-edge / full-height content inside the shell. */
function isImmersivePath(pathname: string): boolean {
  if (/^\/documents\/[^/]+$/.test(pathname)) return true;
  if (/^\/practice\/[^/]+$/.test(pathname)) return true;
  return false;
}

type Props = {
  children: ReactNode;
};

/**
 * Learner main column — responsive padding, immersive mode for PDF/exam player,
 * and safe-area aware bottom spacing.
 */
export function AppMain({ children }: Props) {
  const pathname = usePathname();
  const immersive = isImmersivePath(pathname);

  return (
    <main
      className={cn(
        'mx-auto w-full min-w-0 flex-1 overflow-x-clip',
        immersive
          ? 'flex max-w-none flex-col px-0 py-0 pb-[env(safe-area-inset-bottom,0px)]'
          : 'max-w-[var(--app-content-max,72rem)] px-3 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-6 md:px-6 lg:px-8 lg:py-7',
      )}
    >
      {immersive ? children : <PageShell>{children}</PageShell>}
    </main>
  );
}
