import {
  DEFAULT_FOOTER,
  DEFAULT_PAGE_HEADERS,
  type PageHeaderContent,
  type PageHeaderKey,
} from '@your-academy/shared';
import { getPublicHomepage } from '@/lib/api/homepage';

/**
 * DEC-069 — published CMS text for the footer and listing-page headers (Server Components).
 * Uses the same cached, `homepage`-tagged fetch as the homepage, so Publish purges it.
 * Never throws: missing content or an API failure → the built-in default text.
 */
async function publishedPayload() {
  try {
    return (await getPublicHomepage()).payload;
  } catch {
    return null;
  }
}

export async function getPageHeader(key: PageHeaderKey): Promise<PageHeaderContent> {
  const fallback = DEFAULT_PAGE_HEADERS[key];
  const cms = (await publishedPayload())?.pageHeaders?.[key];
  if (!cms) return fallback;
  return {
    eyebrow: cms.eyebrow ?? fallback.eyebrow,
    heading: cms.heading?.trim() || fallback.heading,
    description: cms.description ?? fallback.description,
    metaTitle: cms.metaTitle?.trim() || fallback.metaTitle,
    metaDescription: cms.metaDescription?.trim() || fallback.metaDescription,
  };
}

export async function getFooterContent(): Promise<typeof DEFAULT_FOOTER> {
  const cms = (await publishedPayload())?.footer;
  if (!cms) return DEFAULT_FOOTER;
  return {
    tagline: cms.tagline ?? DEFAULT_FOOTER.tagline,
    accountHeading: cms.accountHeading?.trim() || DEFAULT_FOOTER.accountHeading,
    accountLinks: cms.accountLinks?.length ? cms.accountLinks : DEFAULT_FOOTER.accountLinks,
    helpText: cms.helpText ?? DEFAULT_FOOTER.helpText,
    copyright: cms.copyright?.trim() || DEFAULT_FOOTER.copyright,
  };
}

/** Metadata from a page header (absolute title — no template suffix is added). */
export function pageHeaderMetadata(h: PageHeaderContent, canonical: string) {
  return {
    title: { absolute: h.metaTitle },
    ...(h.metaDescription ? { description: h.metaDescription } : {}),
    alternates: { canonical },
    openGraph: {
      title: h.metaTitle,
      ...(h.metaDescription ? { description: h.metaDescription } : {}),
      url: canonical,
      type: 'website' as const,
      siteName: 'Your Academy',
    },
  };
}
