import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { JsonLd, breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { fetchPublicData, snippet } from '@/lib/seo/fetch-public';
import { decodeRouteParam } from '@/lib/route-params';

type Props = { children: ReactNode; params: Promise<{ id: string }> };

type DocumentSummary = {
  id: string;
  title: string;
  description?: string | null;
  visibility: 'PUBLIC' | 'AUTHENTICATED' | 'PREMIUM' | string;
};

const getDocument = (id: string) =>
  fetchPublicData<DocumentSummary>(`/public/documents/${encodeURIComponent(id)}`);

/** Per-column title / description (the page itself renders on the client). */
export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const doc = await getDocument(decodeRouteParam((await params).id));
  if (!doc) return { title: 'Newspaper column', robots: { index: false, follow: true } };
  return {
    title: doc.title,
    description:
      snippet(doc.description) ?? `${doc.title} — newspaper column PDF on Your Academy.`,
    alternates: { canonical: `/news/d/${encodeURIComponent(doc.id)}` },
    // Login-only / premium PDFs are not readable by crawlers.
    ...(doc.visibility === 'PUBLIC' ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function NewsDocumentLayout({ children, params }: Props) {
  const doc = await getDocument(decodeRouteParam((await params).id));
  return (
    <>
      {doc ? (
        <JsonLd
          data={breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'পত্রিকার গুরুত্বপূর্ণ কলাম', path: '/news' },
            { name: doc.title, path: `/news/d/${encodeURIComponent(doc.id)}` },
          ])}
        />
      ) : null}
      {children}
    </>
  );
}
