import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MarketingPage } from '@/components/layout/marketing-page';
import { PaymentResultView } from '@/features/billing/payment-result-view';

export const metadata: Metadata = { title: 'Payment', robots: { index: false } };

/** SSLCommerz redirects here after the API handled the gateway callback (DEC-060). */
export default function PaymentFailedPage() {
  return (
    <MarketingPage>
      <Suspense fallback={null}>
        <PaymentResultView page="failed" />
      </Suspense>
    </MarketingPage>
  );
}
