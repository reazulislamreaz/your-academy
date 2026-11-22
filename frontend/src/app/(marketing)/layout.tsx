import type { ReactNode } from 'react';
import { MarketingShell } from '@/components/layout/marketing-shell';
import { getPublicSocialLinks } from '@/lib/api/social-links';

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const socialLinks = await getPublicSocialLinks();
  return <MarketingShell socialLinks={socialLinks}>{children}</MarketingShell>;
}
