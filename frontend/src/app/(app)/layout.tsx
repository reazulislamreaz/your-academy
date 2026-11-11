import type { ReactNode } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { PageShell } from '@/components/motion/page-shell';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--bg-desk)]">
      <div className="hidden lg:block">
        <div className="sticky top-0 h-screen">
          <AppSidebar />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="mx-auto w-full max-w-[1120px] min-w-0 flex-1 px-3 py-5 sm:px-6 sm:py-7">
          <PageShell>{children}</PageShell>
        </main>
      </div>
    </div>
  );
}
