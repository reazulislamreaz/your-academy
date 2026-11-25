import type { Metadata } from 'next';
import { MarketingPage } from '@/components/layout/marketing-page';
import { PackagesView } from '@/features/billing/packages-view';
import { getPageHeader, pageHeaderMetadata } from '@/lib/site-content';

/** DEC-069 — header + SEO from Admin → Page Headers (defaults = previous text). */
export async function generateMetadata(): Promise<Metadata> {
  return pageHeaderMetadata(await getPageHeader('packages'), '/packages');
}

export default async function PackagesPage() {
  const header = await getPageHeader('packages');
  return (
    <MarketingPage>
      <PackagesView header={header} />
    </MarketingPage>
  );
}
