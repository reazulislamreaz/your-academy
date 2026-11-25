/** Pure request helpers for the throttler (no Nest/JWT imports, so they are easy to test). */

/** Paths that serve question/exam content — the bulk-scraping budget applies here. */
const CONTENT_PATH =
  /^\/api\/v1\/(public\/(questions|question-sets|written-question-sets|topic-|exams|model-tests)|questions|practice-sets|practice-attempts)/;

/** Autosaves while answering (one per answer) — not content reads (RL-7). */
const PROGRESS_SAVE_PATH = /^\/api\/v1\/practice-attempts\/[^/]+\/progress\/?$/;

export function isContentPath(path: string): boolean {
  return CONTENT_PATH.test(path) && !PROGRESS_SAVE_PATH.test(path);
}

/** Client IP: a trusted edge header (e.g. Cloudflare's) when configured, else Express's req.ip. */
export function clientIp(req: { headers: Record<string, unknown>; ip?: string }): string {
  const header = process.env.TRUSTED_CLIENT_IP_HEADER?.toLowerCase();
  const fromHeader = header ? req.headers[header] : undefined;
  if (typeof fromHeader === 'string' && fromHeader.length > 0 && fromHeader.length <= 64) {
    return fromHeader.split(',')[0].trim();
  }
  return req.ip ?? 'unknown';
}

/** RFC 1918 / unique-local peers: other containers on the private Docker network. */
const PRIVATE_PEER = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|f[cd][0-9a-f]{2}:)/i;

/**
 * RL-2 — a server-to-server call from the Next.js container (build-time / ISR fetches such as
 * the sitemap, homepage and stats). The API publishes no host port, and nginx always SETS
 * X-Forwarded-For, so a request from a private peer WITHOUT that header can only come from
 * another container. Visitor-driven SSR fetches forward the visitor's X-Forwarded-For and stay
 * limited per visitor. Loopback is deliberately not included (local dev hits the API directly).
 */
export function isInternalServerRequest(req: {
  headers: Record<string, unknown>;
  socket?: { remoteAddress?: string };
}): boolean {
  if (req.headers['x-forwarded-for'] !== undefined) return false;
  const peer = (req.socket?.remoteAddress ?? '').replace(/^::ffff:/i, '');
  return PRIVATE_PEER.test(peer);
}
