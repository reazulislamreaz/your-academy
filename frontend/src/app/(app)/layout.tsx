import type { ReactNode } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { PageShell } from '@/components/motion/page-shell';
import { LearnerThemeProvider } from '@/components/theme/learner-theme-provider';
import { LearnerGate } from '@/features/auth/learner-gate';
import { SupportChatProvider } from '@/features/support/support-chat-provider';
import { LEARNER_THEME_BOOT_SCRIPT, LEARNER_THEME_DEFAULT } from '@/lib/learner-theme';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="learner-theme desk-canvas flex min-h-screen overflow-x-clip"
      data-theme={LEARNER_THEME_DEFAULT}
      suppressHydrationWarning
    >
      {/* Prevent theme flash before React hydrates (reads localStorage). */}
      <script dangerouslySetInnerHTML={{ __html: LEARNER_THEME_BOOT_SCRIPT }} />
      <LearnerThemeProvider>
        <LearnerGate>
          <SupportChatProvider mode="learner">
            <div className="hidden lg:block">
              <div className="sticky top-0 h-screen">
                <AppSidebar />
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
              <AppHeader />
              <main className="mx-auto w-full max-w-[var(--app-content-max,72rem)] min-w-0 flex-1 px-3 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-7 lg:px-8">
                <PageShell>{children}</PageShell>
              </main>
            </div>
          </SupportChatProvider>
        </LearnerGate>
      </LearnerThemeProvider>
    </div>
  );
}
