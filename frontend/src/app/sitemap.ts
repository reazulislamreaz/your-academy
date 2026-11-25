import type { MetadataRoute } from 'next';
import { serverApiBase } from '@/lib/api/client';
import { absoluteUrl } from '@/lib/seo/site';

/**
 * Dynamic sitemap: static landing pages + every public detail page a logged-out visitor (and
 * so Googlebot) can actually read. Locked sets, paid Model Tests, login-only PDFs and
 * Topic-Based sets (login required) are left out — they show a paywall, not content.
 * Regenerated hourly at runtime; if the API is unreachable the static pages are still served.
 */
export const revalidate = 3600;

/** Protocol limit is 50,000 URLs per file — split into a sitemap index well before that. */
const MAX_URLS = 45_000;
const PAGE_SIZE = 100;
const MAX_PAGES = 200;

const STATIC_PATHS: Array<{ path: string; priority: number }> = [
  { path: '/', priority: 1 },
  { path: '/preli-question-bank', priority: 0.9 },
  { path: '/written-question-bank', priority: 0.9 },
  { path: '/question-bank-categories', priority: 0.8 },
  { path: '/written-question-bank-categories', priority: 0.8 },
  { path: '/topic-categories', priority: 0.7 },
  { path: '/exams', priority: 0.7 },
  { path: '/model-test', priority: 0.7 },
  { path: '/news', priority: 0.7 },
  { path: '/packages', priority: 0.6 },
  { path: '/privacy-policy', priority: 0.3 },
];

type Listed = { id: string; slug?: string; locked?: boolean; visibility?: string } & Record<
  string,
  unknown
>;

/** Walks a cursor-paginated public list (as a logged-out visitor). [] on any failure. */
async function listAll(path: string): Promise<Listed[]> {
  const out: Listed[] = [];
  let cursor: string | null = null;
  try {
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const qs = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (cursor) qs.set('cursor', cursor);
      const res = await fetch(`${serverApiBase()}${path}?${qs}`, {
        next: { revalidate },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) break;
      const json = (await res.json()) as {
        data?: Listed[];
        meta?: { pagination?: { nextCursor?: string | null } };
      };
      out.push(...(json.data ?? []));
      cursor = json.meta?.pagination?.nextCursor ?? null;
      if (!cursor) break;
    }
  } catch {
    // Build time (no API) or a transient error: keep what we have.
  }
  return out;
}

function lastMod(item: Listed, ...keys: string[]): Date | undefined {
  for (const key of keys) {
    const v = item[key];
    if (typeof v === 'string') {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return undefined;
}

const seg = (v: string) => encodeURIComponent(v);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [preli, written, documents, exams, modelTests] = await Promise.all([
    listAll('/public/question-sets'),
    listAll('/public/written-question-sets'),
    listAll('/public/documents'),
    listAll('/public/exams'),
    listAll('/public/model-tests'),
  ]);

  // No fake lastmod for static pages: Google ignores a date that changes on every build.
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map(({ path, priority }) => ({
    url: absoluteUrl(path),
    priority,
  }));

  for (const s of preli.filter((x) => !x.locked)) {
    entries.push({
      url: absoluteUrl(`/preli-question-bank/${seg(s.id)}`),
      lastModified: lastMod(s, 'importedAt', 'uploadedAt'),
      priority: 0.6,
    });
  }
  for (const s of written.filter((x) => !x.locked)) {
    entries.push({
      url: absoluteUrl(`/written-question-bank/${seg(s.id)}`),
      lastModified: lastMod(s, 'importedAt', 'uploadedAt'),
      priority: 0.6,
    });
  }
  for (const d of documents.filter((x) => x.visibility === 'PUBLIC')) {
    entries.push({
      url: absoluteUrl(`/news/d/${seg(d.id)}`),
      lastModified: lastMod(d, 'updatedAt', 'createdAt'),
      priority: 0.5,
    });
  }
  for (const e of exams.filter((x) => x.slug)) {
    entries.push({
      url: absoluteUrl(`/exams/${seg(e.slug!)}`),
      lastModified: lastMod(e, 'updatedAt', 'createdAt'),
      priority: 0.5,
    });
  }
  for (const m of modelTests.filter((x) => x.slug && !x.locked)) {
    entries.push({
      url: absoluteUrl(`/model-test/${seg(m.slug!)}`),
      lastModified: lastMod(m, 'updatedAt', 'createdAt'),
      priority: 0.5,
    });
  }

  return entries.slice(0, MAX_URLS);
}
