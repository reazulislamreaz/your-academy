'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { MarketingHeader } from '@/components/layout/marketing-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { PageShell } from '@/components/motion/page-shell';
import { SupportWidget } from '@/features/support/support-widget';
import { cn } from '@/lib/utils';

/**
 * Immersive document reader routes — footer stays in the site chrome for every
 * other marketing page, but must not sit under / paint over the in-app PDF viewer.
 */
function isDocumentReaderPath(pathname: string): boolean {
  return /^\/news\/d\/[^/]+\/?$/.test(pathname);
}

export function MarketingShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reader = isDocumentReaderPath(pathname);

  return (
    <div
      className={cn(
        'flex min-h-screen flex-col',
        reader && 'h-dvh max-h-dvh overflow-hidden',
      )}
    >
      <MarketingHeader />
      <main
        className={cn('flex min-h-0 flex-1 flex-col', reader && 'overflow-hidden')}
      >
        <PageShell
          className={cn(reader && 'flex min-h-0 flex-1 flex-col')}
          motionClassName={reader ? '' : 'motion-page'}
        >
          {children}
        </PageShell>
      </main>
      {!reader ? <SiteFooter /> : null}
      <SupportWidget mode="guest" />
    </div>
  );
}
