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

/** Live guest exam take page (`/exams/:id`) — hide floating support chat. */
function isLiveExamTakePath(pathname: string): boolean {
  return /^\/exams\/[^/]+\/?$/.test(pathname);
}

export function MarketingShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reader = isDocumentReaderPath(pathname);
  const liveExam = isLiveExamTakePath(pathname);

  return (
    <div
      className={cn(
        'flex min-h-dvh flex-col overflow-x-clip',
        reader && 'h-dvh max-h-dvh overflow-hidden',
      )}
    >
      <MarketingHeader />
      <main
        className={cn(
          'flex min-h-0 w-full flex-1 flex-col',
          reader && 'overflow-hidden',
        )}
      >
        <PageShell
          className={cn(
            'flex min-h-0 w-full flex-1 flex-col',
            reader && 'overflow-hidden',
          )}
          motionClassName={reader ? '' : 'motion-page'}
        >
          {children}
        </PageShell>
      </main>
      {!reader ? <SiteFooter /> : null}
      {!liveExam ? <SupportWidget mode="guest" /> : null}
    </div>
  );
}
