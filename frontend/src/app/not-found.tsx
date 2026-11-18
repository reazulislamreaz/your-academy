import type { Metadata } from 'next';
import { MarketingShell } from '@/components/layout/marketing-shell';
import { NotFoundView } from '@/components/marketing/not-found-view';

export const metadata: Metadata = {
  title: 'Page not found',
  description: 'The page you requested could not be found on Your Academy.',
};

export default function NotFoundPage() {
  return (
    <MarketingShell>
      <NotFoundView />
    </MarketingShell>
  );
}
