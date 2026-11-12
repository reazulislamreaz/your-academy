export type MarketingNavItem = {
  id: string;
  href: string;
  label: string;
  /** Pathname match strategy for the path segment (query handled separately). */
  match: 'exact' | 'prefix';
  /** Required query params for this item to be considered active. */
  query?: Record<string, string>;
  /**
   * When true, this item only wins if no more-specific sibling with the same
   * path matched (e.g. base Preli bank vs Written / Jobs filters).
   */
  fallbackForPath?: boolean;
};

/** Public marketing primary nav — unique destinations, query-aware active state. */
export const marketingNavItems: MarketingNavItem[] = [
  { id: 'home', href: '/', label: 'Home', match: 'exact' },
  {
    id: 'preli',
    href: '/preli-question-bank',
    label: 'Preli Question Bank',
    match: 'prefix',
    fallbackForPath: true,
  },
  {
    id: 'written',
    href: '/preli-question-bank?examTag=bcs-written',
    label: 'Written Question Bank',
    match: 'prefix',
    query: { examTag: 'bcs-written' },
  },
  {
    id: 'news',
    href: '/news',
    label: 'পত্রিকার গুরুত্বপূর্ণ কলাম',
    match: 'prefix',
  },
  {
    id: 'jobs',
    href: '/preli-question-bank?q=Job',
    label: 'চাকরি',
    match: 'prefix',
    query: { q: 'Job' },
  },
];

function pathMatches(pathname: string, hrefPath: string, match: 'exact' | 'prefix'): boolean {
  if (match === 'exact') return pathname === hrefPath;
  if (hrefPath === '/') return pathname === '/';
  return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
}

function queryMatches(
  searchParams: URLSearchParams,
  required?: Record<string, string>,
): boolean {
  if (!required) return true;
  return Object.entries(required).every(([key, value]) => {
    const current = searchParams.get(key);
    if (key === 'q') {
      return (current ?? '').toLowerCase() === value.toLowerCase();
    }
    return current === value;
  });
}

/**
 * Returns the single active marketing nav item id for the current URL.
 * Specific query links win over the base Preli bank fallback.
 */
export function resolveActiveMarketingNavId(
  pathname: string,
  search: string,
  items: MarketingNavItem[] = marketingNavItems,
): string | null {
  const searchParams = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

  const specific = items.find((item) => {
    if (item.fallbackForPath || !item.query) return false;
    const hrefPath = item.href.split('?')[0] || '/';
    return pathMatches(pathname, hrefPath, item.match) && queryMatches(searchParams, item.query);
  });
  if (specific) return specific.id;

  const fallback = items.find((item) => {
    if (!item.fallbackForPath) return false;
    const hrefPath = item.href.split('?')[0] || '/';
    if (!pathMatches(pathname, hrefPath, item.match)) return false;
    // Base bank is active when no competing filter query is present for sibling items.
    const siblingKeys = items
      .filter((s) => s.query && (s.href.split('?')[0] || '/') === hrefPath)
      .flatMap((s) => Object.keys(s.query ?? {}));
    return !siblingKeys.some((key) => searchParams.has(key));
  });
  if (fallback) return fallback.id;

  const plain = items.find((item) => {
    if (item.query || item.fallbackForPath) return false;
    const hrefPath = item.href.split('?')[0] || '/';
    return pathMatches(pathname, hrefPath, item.match);
  });
  return plain?.id ?? null;
}
