import type { ReactNode } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { PageShell } from '@/components/motion/page-shell';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="desk-canvas flex min-h-screen overflow-x-clip">
      <div className="hidden lg:block">
        <div className="sticky top-0 h-screen">
          <AppSidebar />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        <AppHeader />
        <main className="mx-auto w-full max-w-[var(--app-content-max,72rem)] min-w-0 flex-1 px-3 py-5 sm:px-6 sm:py-7 lg:px-8">
          <PageShell>{children}</PageShell>
        </main>
      </div>
    </div>
  );
}
