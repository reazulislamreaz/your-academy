import type { ReactNode } from 'react';
import { AdminShell } from '@/components/layout/admin-shell';
import { LearnerThemeProvider } from '@/components/theme/learner-theme-provider';
import { AdminGate } from '@/features/admin/admin-gate';
import { LEARNER_THEME_BOOT_SCRIPT, LEARNER_THEME_DEFAULT } from '@/lib/learner-theme';

/**
 * Admin uses the same Orbit light/dark token set as the learner dashboard
 * (`.learner-theme` + `data-theme`), with navy admin chrome layered on top.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="learner-theme admin-theme desk-canvas flex min-h-screen overflow-x-clip"
      data-theme={LEARNER_THEME_DEFAULT}
      suppressHydrationWarning
    >
      <script dangerouslySetInnerHTML={{ __html: LEARNER_THEME_BOOT_SCRIPT }} />
      <LearnerThemeProvider>
        <AdminGate>
          <AdminShell>{children}</AdminShell>
        </AdminGate>
      </LearnerThemeProvider>
    </div>
  );
}
