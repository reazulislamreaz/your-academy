import type { ReactNode } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { AppMain } from '@/components/layout/app-main';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { LearnerThemeProvider } from '@/components/theme/learner-theme-provider';
import { BrowsingHeartbeat } from '@/features/analytics/browsing-heartbeat';
import { LearnerGate } from '@/features/auth/learner-gate';
import { SupportChatProvider } from '@/features/support/support-chat-provider';
import { LEARNER_THEME_BOOT_SCRIPT, LEARNER_THEME_DEFAULT } from '@/lib/learner-theme';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="learner-theme desk-canvas flex min-h-dvh overflow-x-clip"
      data-theme={LEARNER_THEME_DEFAULT}
      suppressHydrationWarning
    >
      {/* Prevent theme flash before React hydrates (reads localStorage). */}
      <script dangerouslySetInnerHTML={{ __html: LEARNER_THEME_BOOT_SCRIPT }} />
      <LearnerThemeProvider>
        <LearnerGate>
          <BrowsingHeartbeat />
          <SupportChatProvider mode="learner">
            <div className="hidden lg:block">
              <div className="sticky top-0 h-dvh">
                <AppSidebar />
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
              <AppHeader />
              <AppMain>{children}</AppMain>
            </div>
          </SupportChatProvider>
        </LearnerGate>
      </LearnerThemeProvider>
    </div>
  );
}
