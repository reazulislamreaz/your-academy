import type { Metadata } from 'next';
import { LearnerPage } from '@/components/layout/learner-page';
import { BillingView } from '@/features/billing/billing-view';

export const metadata: Metadata = { title: 'My Subscription' };

export default function BillingPage() {
  return (
    <LearnerPage>
      <BillingView />
    </LearnerPage>
  );
}
