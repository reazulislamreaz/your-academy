import type { Metadata } from 'next';
import { ModelTestListing } from '@/features/model-tests/model-test-listing';
import { getPageHeader, pageHeaderMetadata } from '@/lib/site-content';

/** DEC-069 — header + SEO from Admin → Page Headers (defaults = previous text). */
export async function generateMetadata(): Promise<Metadata> {
  return pageHeaderMetadata(await getPageHeader('modelTest'), '/model-test');
}

export default async function PublicModelTestListPage() {
  const header = await getPageHeader('modelTest');
  return <ModelTestListing header={header} />;
}
