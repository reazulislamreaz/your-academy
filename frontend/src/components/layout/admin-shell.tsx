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
      <div className="hidden lg:block">
        <div className="sticky top-0 h-screen">
          <AdminSidebar
            footerExtra={<LearnerThemeToggle className="border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white" />}
          />
        </div>
      </div>
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col overflow-x-clip',
          isMessaging && 'h-dvh max-h-dvh overflow-hidden',
        )}
      >
        <AdminMobileNav themeToggle={<LearnerThemeToggle />} />

        <main
          className={cn(
            'flex min-w-0 flex-1 flex-col',
            isMessaging
              ? 'min-h-0 overflow-hidden p-0'
              : 'mx-auto w-full max-w-7xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8',
          )}
        >
          {isMessaging ? children : <PageShell>{children}</PageShell>}
        </main>
      </div>
    </>
  );
}
