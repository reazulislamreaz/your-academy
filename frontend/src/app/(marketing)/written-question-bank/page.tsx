import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MarketingPage } from '@/components/layout/marketing-page';
import { PageHeader } from '@/components/layout/page-header';
import { ListCardSkeleton } from '@/components/loading';
import { WrittenQuestionBank } from '@/features/written-question-bank/public-question-bank';
import type { PublicWrittenQuestionSet } from '@/lib/api/written-questions';
import { fetchPublicList } from '@/lib/seo/fetch-public';
import { getPageHeader, pageHeaderMetadata } from '@/lib/site-content';

/** DEC-069 — header + SEO from Admin → Page Headers (defaults = previous text). */
export async function generateMetadata(): Promise<Metadata> {
  return {
    ...pageHeaderMetadata(await getPageHeader('written'), '/written-question-bank'),
    robots: { index: true, follow: true },
  };
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const FILTER_KEYS = ['q', 'categoryId', 'subcategoryId', 'year'] as const;

/**
 * Server-rendered H1 + intro and the first page of collections, so crawlers get real content
 * (the list used to load only in the browser). Filters, search and paging stay client-side.
 */
export default async function WrittenQuestionBankPage({ searchParams }: Props) {
  const [sp, header] = await Promise.all([searchParams, getPageHeader('written')]);
  const filtered = FILTER_KEYS.some((k) => Boolean(sp[k]));
  const initialSets = filtered
    ? null
    : await fetchPublicList<PublicWrittenQuestionSet>('/public/written-question-sets?limit=20');

  return (
    <MarketingPage density="compact">
      <PageHeader
        eyebrow={header.eyebrow || undefined}
        title={header.heading}
        description={header.description || undefined}
      />
      <Suspense fallback={<ListCardSkeleton rows={4} rowClassName="min-h-24 py-5" />}>
        <WrittenQuestionBank initialSets={initialSets ?? undefined} />
      </Suspense>
    </MarketingPage>
  );
}
