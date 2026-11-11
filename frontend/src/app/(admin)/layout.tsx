'use client';

import type { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { AdminMobileNav } from '@/components/layout/admin-mobile-nav';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { BrandMark } from '@/components/layout/brand-mark';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/motion/page-shell';
import { AdminGate } from '@/features/admin/admin-gate';
import { useLogout, useMe } from '@/features/auth/use-auth';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const me = useMe();
  const logout = useLogout();

  return (
    <AdminGate>
      <div className="flex min-h-screen bg-[var(--bg-desk)]">
        <div className="hidden lg:block">
          <div className="sticky top-0 h-screen">
            <AdminSidebar />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="sticky top-0 z-30 lg:static">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--bg-inverse)] px-4 py-3 text-white lg:hidden">
              <BrandMark inverse markOnly href="/admin/dashboard" />
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-medium text-white/80">
                  {me.data?.name ?? 'Admin'}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-white/70 hover:bg-white/10 hover:text-white"
                  disabled={logout.isPending}
                  aria-label="Sign out"
                  onClick={() => logout.mutate()}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <header className="sticky top-0 z-20 hidden border-b border-[var(--line)] bg-white/90 px-6 py-3 backdrop-blur-md lg:block">
              <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
                <p className="text-sm font-medium text-[var(--muted-strong)]">
                  Your Academy · Platform management
                </p>
                <p className="truncate text-sm font-semibold text-[var(--ink-soft)]">
                  {me.data?.name}
                </p>
              </div>
            </header>
            <AdminMobileNav />
          </div>
          <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-3 py-5 sm:px-6 sm:py-8">
            <PageShell>{children}</PageShell>
          </main>
        </div>
      </div>
    </AdminGate>
  );
}
