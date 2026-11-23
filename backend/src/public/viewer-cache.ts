import type { Response } from 'express';
import type { RequestUser } from '../auth/auth.types';

/**
 * DEC-051: answer-bearing public responses differ per viewer. Anonymous responses may
 * stay in shared caches; anything served to a signed-in viewer must never be shared.
 */
export function setViewerCacheHeaders(
  res: Response,
  viewer: RequestUser | null | undefined,
  anonymousCacheControl = 'no-cache',
): void {
  res.setHeader('Vary', 'Cookie, Authorization');
  res.setHeader('Cache-Control', viewer ? 'private, no-store' : anonymousCacheControl);
}
