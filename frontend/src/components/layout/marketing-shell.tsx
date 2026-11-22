'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { MarketingHeader } from '@/components/layout/marketing-header';
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

/** Live guest exam / model-test take pages — hide floating support chat. */
function isLiveExamTakePath(pathname: string): boolean {
  return (
    /^\/exams\/[^/]+\/?$/.test(pathname) || /^\/model-test\/[^/]+\/?$/.test(pathname)
  );
}

/**
 * Public marketing chrome: sticky-bottom footer.
 * Short pages (`/news` empty, empty banks, directories) keep the footer below the
 * fold via `min-h-dvh` + `main.flex-1` — never let the footer ride up mid-viewport.
 *
 * `footer` is a Server Component slot from the marketing layout so social links
 * stay server-fetched (DEC-046) and are not imported into this client bundle.
 */
export function MarketingShell({
  children,
  footer = null,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  const pathname = usePathname();
  const reader = isDocumentReaderPath(pathname);
  const liveExam = isLiveExamTakePath(pathname);

  return (
    <div
      className={cn(
        'flex min-h-dvh flex-1 flex-col overflow-x-clip',
        reader && 'h-dvh max-h-dvh overflow-hidden',
      )}
    >
      <MarketingHeader />
      <main
        className={cn(
          // Grow to fill leftover viewport under the header so short pages
          // don't leave the footer mid-screen.
          'flex w-full flex-1 flex-col',
          'min-h-[calc(100dvh-var(--marketing-header-offset,4.5rem))]',
          reader && 'min-h-0 overflow-hidden',
        )}
      >
        <PageShell
          className={cn(
            'flex w-full flex-1 flex-col',
            reader && 'min-h-0 overflow-hidden',
          )}
          motionClassName={reader ? '' : 'motion-page'}
        >
          {children}
        </PageShell>
      </main>
      {!reader ? footer : null}
      {!liveExam ? <SupportWidget mode="guest" /> : null}
    </div>
  );
}
