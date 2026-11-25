import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ProtectedContent } from '@/components/content-protection/protected-content';
import { JsonLd, breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { fetchPublicData, snippet } from '@/lib/seo/fetch-public';
import { decodeRouteParam } from '@/lib/route-params';

type Props = { children: ReactNode; params: Promise<{ batchId: string }> };

type SetSummary = {
  id: string;
  title: string;
  locked: boolean;
  description?: string | null;
  topic?: string | null;
  sheetPreamble?: string | null;
};

const getSet = (id: string) =>
  fetchPublicData<SetSummary>(`/public/written-question-sets/${encodeURIComponent(id)}`);

/** Unique title / description per set (was the site default for every set). */
export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const id = decodeRouteParam((await params).batchId);
  const set = await getSet(id);
  if (!set) return { title: 'Written Question Bank', robots: { index: false, follow: true } };
  return {
    title: `${set.title} — Written Question Bank`,
    description: snippet(set.description, set.topic, set.sheetPreamble),
    alternates: { canonical: `/written-question-bank/${encodeURIComponent(set.id)}` },
    // Locked sets show a paywall to crawlers (no questions) — keep them out of the index.
    ...(set.locked ? { robots: { index: false, follow: true } } : {}),
  };
}

/** Copy/print deterrents + watermark for learner question content (not a security boundary). */
export default async function ProtectedSegmentLayout({ children, params }: Props) {
  const id = decodeRouteParam((await params).batchId);
  const set = await getSet(id);
  return (
    <>
      {set ? (
        <JsonLd
          data={breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Written Question Bank', path: '/written-question-bank' },
            { name: set.title, path: `/written-question-bank/${encodeURIComponent(set.id)}` },
          ])}
        />
      ) : null}
      <ProtectedContent>{children}</ProtectedContent>
    </>
  );
}
