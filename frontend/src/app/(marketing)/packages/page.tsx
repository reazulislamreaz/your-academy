import type { Metadata } from 'next';
import { MarketingPage } from '@/components/layout/marketing-page';
import { PackagesView } from '@/features/billing/packages-view';

export const metadata: Metadata = {
  title: 'Packages',
  description: 'Subscribe to unlock every Preli and Written question set and paid Model Test.',
  alternates: { canonical: '/packages' },
};

export default function PackagesPage() {
  return (
    <MarketingPage>
      <PackagesView />
    </MarketingPage>
  );
}
