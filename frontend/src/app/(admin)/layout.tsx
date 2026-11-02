import type { ReactNode } from 'react';
import Link from 'next/link';
import { AdminMobileNav } from '@/components/layout/admin-mobile-nav';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { AdminGate } from '@/features/admin/admin-gate';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGate>
      <div className="flex min-h-screen bg-[var(--bg)]">
        <div className="hidden lg:block">
          <div className="sticky top-0 h-screen">
            <AdminSidebar />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-3 lg:hidden">
            <p className="font-display text-lg font-bold">Admin</p>
            <Link href="/questions" className="text-sm text-[var(--muted)]">
              Exit
            </Link>
          </div>
          <AdminMobileNav />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 motion-fade-in">
            {children}
          </main>
        </div>
      </div>
    </AdminGate>
  );
}
