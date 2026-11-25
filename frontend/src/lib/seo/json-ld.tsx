import { SITE_NAME, SITE_URL, absoluteUrl } from './site';

/** Server-rendered JSON-LD block. `<` is escaped so content can never close the script tag. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // Static JSON; `<` is escaped so the payload cannot close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

/** schema.org BreadcrumbList; `path` items become absolute canonical URLs. */
export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Homepage: the organisation and the website (no SearchAction — there is no site-wide search URL). */
export function organizationAndWebsiteJsonLd() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: absoluteUrl('/images/apple-touch-icon.png'),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: 'bn-BD',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ];
}
