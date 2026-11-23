import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { AppMain } from '@/components/layout/app-main';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { LearnerThemeProvider } from '@/components/theme/learner-theme-provider';
import { BrowsingHeartbeat } from '@/features/analytics/browsing-heartbeat';
import { LearnerGate } from '@/features/auth/learner-gate';
import { NoEmailReminder } from '@/features/auth/no-email-reminder';
import { SupportChatProvider } from '@/features/support/support-chat-provider';
import { LEARNER_THEME_BOOT_SCRIPT, LEARNER_THEME_DEFAULT } from '@/lib/learner-theme';

/** Learner dashboard pages are personal and partly premium — keep them out of search. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

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
            <div
              className="hidden shrink-0 lg:block"
              style={{ width: 'var(--ya-learner-sidebar-w, var(--app-sidebar-width, 16.25rem))' }}
              aria-hidden
            />
            <div className="fixed inset-y-0 left-0 z-20 hidden h-dvh max-h-dvh lg:block">
              <AppSidebar />
            </div>
            <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
              <AppHeader />
              <NoEmailReminder />
              <AppMain>{children}</AppMain>
            </div>
          </SupportChatProvider>
        </LearnerGate>
      </LearnerThemeProvider>
    </div>
  );
}
