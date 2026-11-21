import type { Metadata } from 'next';
import { ModelTestListing } from '@/features/model-tests/model-test-listing';

export const metadata: Metadata = {
  title: 'Model Test',
  description: 'Take timed public Model Tests on Your Academy — search, filter, and review.',
};

export default function PublicModelTestListPage() {
  return <ModelTestListing />;
}
