import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://youracademy.com.bd';

/**
 * Public crawl rules — block authenticated learner/admin surfaces and attempt results; allow marketing banks.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          // Authenticated learner app — personal/paid content, never indexed.
          '/home',
          '/profile',
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
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/verify-email',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
