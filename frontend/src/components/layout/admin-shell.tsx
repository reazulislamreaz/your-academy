'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AdminMobileNav } from '@/components/layout/admin-mobile-nav';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { PageShell } from '@/components/motion/page-shell';
import { LearnerThemeToggle } from '@/components/theme/learner-theme-toggle';
import { cn } from '@/lib/utils';

/** Inner admin chrome — theme tokens come from parent `.learner-theme` shell. */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isMessaging = pathname.startsWith('/admin/support');

  return (
    <>
      {/*
        Fixed (viewport-anchored) desktop sidebar — immune to document scroll and
        modal body locks. A matching in-flow spacer preserves main-column width,
        including collapse via --ya-admin-sidebar-w set by AdminSidebar.
      */}
      <div
        className="hidden shrink-0 lg:block"
        style={{ width: 'var(--ya-admin-sidebar-w, var(--app-sidebar-width, 16.25rem))' }}
        aria-hidden
      />
      <div className="fixed inset-y-0 left-0 z-20 hidden h-dvh max-h-dvh lg:block">
        <AdminSidebar
          footerExtra={
            <LearnerThemeToggle className="border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white" />
          }
        />
      </div>
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col overflow-x-clip',
          isMessaging && 'h-dvh max-h-dvh overflow-hidden',
        )}
      >
        <AdminMobileNav themeToggle={<LearnerThemeToggle />} />

        <main
          id="main-content"
          className={cn(
            'flex min-w-0 flex-1 flex-col',
            isMessaging
              ? 'min-h-0 overflow-hidden p-0'
              : 'mx-auto w-full max-w-7xl px-3 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8 lg:px-8',
          )}
        >
          {isMessaging ? children : <PageShell>{children}</PageShell>}
        </main>
      </div>
    </>
  );
}
