import type { Request } from 'express';

/**
 * Access token for browser sessions is an HTTP-only cookie.
 * Non-browser clients may send `Authorization: Bearer <jwt>` instead.
 * Bearer is used only when the header is exactly `Bearer` plus one token.
 */
export function cookieOrBearerExtractor(
  req: Pick<Request, 'headers' | 'cookies'>,
): string | null {
  const raw = req.headers?.authorization;
  if (typeof raw === 'string') {
    const parts = raw.trim().split(/\s+/);
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer' && parts[1]) {
      return parts[1];
    }
  }
  const name = process.env.ACCESS_COOKIE_NAME ?? 'access_token';
  const cookie = req.cookies?.[name];
  return typeof cookie === 'string' && cookie.length > 0 ? cookie : null;
}
