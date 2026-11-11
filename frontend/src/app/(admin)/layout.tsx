import type { ReactNode } from 'react';
import Link from 'next/link';
import { AdminMobileNav } from '@/components/layout/admin-mobile-nav';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { AdminGate } from '@/features/admin/admin-gate';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGate>
      <div className="flex min-h-screen bg-[var(--bg-desk)]">
        <div className="hidden lg:block">
          <div className="sticky top-0 h-screen">
            <AdminSidebar />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--bg-inverse)] px-4 py-3 text-white lg:hidden">
            <p className="font-display text-lg font-bold tracking-tight">Admin</p>
            <Link href="/home" className="text-sm text-white/65 hover:text-white">
              Exit
            </Link>
          </div>
          <header className="sticky top-0 z-20 hidden border-b border-[var(--line)] bg-white/90 px-6 py-3 backdrop-blur-md lg:block">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
              <p className="text-sm font-medium text-[var(--muted)]">
                Your Academy · Platform management
              </p>
              <Link
                href="/home"
                className="text-sm font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
              >
                Back to study desk
              </Link>
            </div>
          </header>
          <AdminMobileNav />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 motion-fade-in sm:px-6 sm:py-8">
            {children}
          </main>
        </div>
      </div>
    </AdminGate>
  );
}
