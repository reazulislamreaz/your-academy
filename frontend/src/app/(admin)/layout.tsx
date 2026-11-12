'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { AdminMobileNav } from '@/components/layout/admin-mobile-nav';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { BrandMark } from '@/components/layout/brand-mark';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/motion/page-shell';
import { AdminGate } from '@/features/admin/admin-gate';
import { useLogout, useMe } from '@/features/auth/use-auth';
import { cn } from '@/lib/utils';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const me = useMe();
  const logout = useLogout();
  const pathname = usePathname();
  const isMessaging = pathname.startsWith('/admin/support');

  return (
    <AdminGate>
      <div
        className="learner-theme desk-canvas flex min-h-screen overflow-x-clip"
        data-theme="light"
      >
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
          <div className="sticky top-0 z-30 min-w-0 max-w-full shrink-0 lg:static">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-3 lg:hidden">
              <BrandMark markOnly href="/admin/dashboard" />
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-medium text-[var(--ink-soft)]">
                  {me.data?.name ?? 'Admin'}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  disabled={logout.isPending}
                  aria-label="Sign out"
                  onClick={() => logout.mutate()}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {!isMessaging ? (
              <header
                className="sticky top-0 z-20 hidden border-b border-[var(--line)] bg-[var(--bg-elevated)]/90 px-6 py-3 backdrop-blur-md lg:block"
                style={{ boxShadow: 'var(--shadow-header)' }}
              >
                <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--muted-strong)]">
                    Your Academy · Platform management
                  </p>
                  <p className="truncate text-sm font-semibold text-[var(--ink-soft)]">
                    {me.data?.name}
                  </p>
                </div>
              </header>
            ) : null}
            {!isMessaging ? <AdminMobileNav /> : null}
          </div>
          <main
            className={cn(
              'flex min-w-0 flex-1 flex-col',
              isMessaging
                ? 'min-h-0 overflow-hidden p-0'
                : 'mx-auto w-full max-w-6xl px-3 py-5 sm:px-6 sm:py-8',
            )}
          >
            {isMessaging ? children : <PageShell>{children}</PageShell>}
          </main>
        </div>
      </div>
    </AdminGate>
  );
}
