import type { Metadata } from 'next';
import { NewsListing } from '@/features/news/news-listing';
import { getPageHeader, pageHeaderMetadata } from '@/lib/site-content';

/** DEC-069 — header + SEO from Admin → Page Headers (defaults = previous text). */
export async function generateMetadata(): Promise<Metadata> {
  return pageHeaderMetadata(await getPageHeader('news'), '/news');
}

export default async function NewsPage() {
  const header = await getPageHeader('news');
  return <NewsListing header={header} />;
}
