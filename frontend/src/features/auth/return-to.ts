/**
 * Where to send someone after login / register. `callbackUrl` (login prompt modal) and the
 * older `next` (route guards, paywalls) are both accepted; only same-site paths are used.
 */

type Params = Pick<URLSearchParams, 'get'>;

/** "/topic-categories?x=1" yes; "//evil.com", "/\\evil.com", "https://…" no. */
export function isSafeInternalPath(path: string | null | undefined): path is string {
  return (
    typeof path === 'string' &&
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.startsWith('/\\') &&
    // Control characters (tabs / newlines) can turn into "//" after browser normalisation.
    ![...path].some((ch) => ch.charCodeAt(0) < 0x20)
  );
}

/** Safe return path from the query (`callbackUrl` first, then `next`), else null. */
export function readReturnTo(params: Params): string | null {
  for (const key of ['callbackUrl', 'next'] as const) {
    const value = params.get(key);
    if (isSafeInternalPath(value)) return value;
  }
  return null;
}

/** Query suffix that keeps the return path when switching between login and register. */
export function returnToQuery(params: Params): string {
  const callbackUrl = params.get('callbackUrl');
  if (isSafeInternalPath(callbackUrl)) return `?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const next = params.get('next');
  if (isSafeInternalPath(next)) return `?next=${encodeURIComponent(next)}`;
  return '';
}

export function loginUrlWithCallback(target: string): string {
  return isSafeInternalPath(target) ? `/login?callbackUrl=${encodeURIComponent(target)}` : '/login';
}
