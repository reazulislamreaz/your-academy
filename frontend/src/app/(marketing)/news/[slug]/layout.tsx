import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { JsonLd, breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { fetchPublicData, snippet } from '@/lib/seo/fetch-public';
import { SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/seo/site';
import { decodeRouteParam } from '@/lib/route-params';

type Props = { children: ReactNode; params: Promise<{ slug: string }> };

type NewsArticle = { title: string; body: string; publishedAt?: string | null };

const getArticle = (slug: string) =>
  fetchPublicData<NewsArticle>(`/news/${encodeURIComponent(slug)}`);

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const slug = decodeRouteParam((await params).slug);
  const article = await getArticle(slug);
  if (!article) return { title: 'Article not found', robots: { index: false, follow: true } };
  return {
    title: article.title,
    description: snippet(article.body.replace(/<[^>]+>/g, ' ')),
    alternates: { canonical: `/news/${encodeURIComponent(slug)}` },
    openGraph: { type: 'article', title: article.title, publishedTime: article.publishedAt ?? undefined },
  };
}

/** Published news article: Article + BreadcrumbList (only fields the article really has). */
export default async function NewsArticleLayout({ children, params }: Props) {
  const slug = decodeRouteParam((await params).slug);
  const article = await getArticle(slug);
  const path = `/news/${encodeURIComponent(slug)}`;
  return (
    <>
      {article ? (
        <JsonLd
          data={[
            {
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: article.title.slice(0, 110),
              ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
              mainEntityOfPage: absoluteUrl(path),
              publisher: { '@type': 'Organization', name: SITE_NAME, '@id': `${SITE_URL}/#organization` },
            },
            breadcrumbJsonLd([
              { name: 'Home', path: '/' },
              { name: 'পত্রিকার গুরুত্বপূর্ণ কলাম', path: '/news' },
              { name: article.title, path },
            ]),
          ]}
        />
      ) : null}
      {children}
    </>
  );
}
