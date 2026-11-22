import type { ReactNode } from 'react';
import { MarketingShell } from '@/components/layout/marketing-shell';
import { SiteFooter } from '@/components/layout/site-footer';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <MarketingShell footer={<SiteFooter />}>{children}</MarketingShell>;
}
