import { headers } from 'next/headers';

/**
 * RL-2 — server-only: forward the visitor's IP (as set by nginx) on visitor-driven server
 * fetches, so the API rate-limits each visitor separately instead of every page view sharing
 * the web container's bucket. The API trusts this header only from private Docker peers.
 */
export function forwardedForFrom(value: string | null | undefined): Record<string, string> {
  const ip = value?.split(',')[0]?.trim();
  return ip && ip.length <= 64 ? { 'x-forwarded-for': ip } : {};
}

export async function visitorIpHeader(): Promise<Record<string, string>> {
  return forwardedForFrom((await headers()).get('x-forwarded-for'));
}
