import type { ReactNode } from 'react';
import { MarketingHeader } from '@/components/layout/marketing-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { PageShell } from '@/components/motion/page-shell';
import { SupportWidget } from '@/features/support/support-widget';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <PageShell>{children}</PageShell>
      </main>
      <SiteFooter />
      <SupportWidget mode="guest" />
    </div>
  );
}
