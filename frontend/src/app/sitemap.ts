import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://youracademy.com.bd';

/** Core public marketing URLs for discovery (banks stay pagination-driven). */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const paths = [
    '/',
    '/preli-question-bank',
    '/written-question-bank',
    '/question-bank-categories',
    '/written-question-bank-categories',
    '/topic-categories',
    '/news',
    '/exams',
    '/model-test',
  ] as const;

  return paths.map((path) => ({
    url: `${SITE_URL}${path === '/' ? '' : path}`,
    lastModified,
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : 0.7,
  }));
}