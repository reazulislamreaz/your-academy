import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo/site';

/**
 * Public crawl rules — block authenticated learner/admin surfaces and attempt results; allow marketing banks.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        // Longest match wins: these public API reads stay crawlable under the `/api/` block, so
        // Googlebot can render client-loaded pages (question sets, PDFs, quizzes, news).
        allow: [
          '/',
          '/api/v1/public/',
          '/api/v1/categories',
          '/api/v1/news/',
          '/api/pdf/',
        ],
        disallow: [
          '/admin/',
          // Authenticated learner app — personal/paid content, never indexed.
          '/home',
          '/profile',
          '/billing',
          '/bookmarks',
          '/onboarding',
          '/questions',
          '/practice',
          '/preli-practice',
          '/preli-questions',
          '/preliminary',
          // Exact + subtree only: a bare `/written` prefix would also block public `/written-question-bank`.
          '/written$',
          '/written/',
          '/topics',
          '/live-quizzes',
          '/live-model-tests',
          '/results',
          '/documents',
          '/model-tests',
          '/quizzes',
          '/daily-quiz',
          '/exam-tracks',
          '/subjects',
          '/previous-year',
          // Personal guest attempt results (pages also send noindex).
          '/exams/*/result',
          '/model-test/*/result',
          '/api/',
          // Login-only PDF bytes.
          '/api/pdf/auth/',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/verify-email',
          // Checkout result pages (also noindex).
          '/payment/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
