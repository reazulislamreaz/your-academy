import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { MarketingShell } from '@/components/layout/marketing-shell';
import { SiteFooter } from '@/components/layout/site-footer';

/**
 * Public pages: self-referencing canonical (path only — query strings such as filters or
 * search never become separate canonical URLs) and shared Open Graph defaults. Pages with a
 * more specific canonical override `alternates`.
 */
export const metadata: Metadata = {
  alternates: { canonical: './' },
  openGraph: { siteName: 'Your Academy', type: 'website', locale: 'bn_BD' },
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <MarketingShell footer={<SiteFooter />}>{children}</MarketingShell>;
}
