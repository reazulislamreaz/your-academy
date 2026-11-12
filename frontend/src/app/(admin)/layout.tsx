'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AdminMobileNav } from '@/components/layout/admin-mobile-nav';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { PageShell } from '@/components/motion/page-shell';
import { AdminGate } from '@/features/admin/admin-gate';
import { cn } from '@/lib/utils';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isMessaging = pathname.startsWith('/admin/support');

  return (
    <AdminGate>
      <div className="admin-theme desk-canvas flex min-h-screen overflow-x-clip">
        <div className="hidden lg:block">
          <div className="sticky top-0 h-screen">
            <AdminSidebar />
          </div>
        </div>
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col overflow-x-clip',
            isMessaging && 'h-dvh max-h-dvh overflow-hidden',
          )}
        >
          <AdminMobileNav />

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
      </div>
    </AdminGate>
  );
}
