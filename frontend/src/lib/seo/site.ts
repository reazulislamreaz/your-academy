/**
 * One canonical origin for every SEO surface (metadataBase, sitemap, robots, JSON-LD).
 * HTTPS apex domain; nginx 301s www and http to it.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://youracademy.com.bd').replace(
  /\/+$/,
  '',
);

export const SITE_NAME = 'Your Academy';

/** Absolute canonical URL for a site path ("/news/d/abc" → "https://…/news/d/abc"). */
export function absoluteUrl(path: string): string {
  if (path === '/' || path === '') return SITE_URL;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
