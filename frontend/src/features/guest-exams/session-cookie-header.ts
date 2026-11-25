import { cookies } from 'next/headers';
import { visitorIpHeader } from '@/lib/api/visitor-ip';

/**
 * Server-only: forward the visitor's cookies to the API so gated endpoints (PAID Model
 * Tests, DEC-060) can see the session, plus the visitor's IP for per-visitor rate limits (RL-2).
 */
export async function sessionCookieHeader(): Promise<Record<string, string>> {
  const cookie = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
  return { ...(await visitorIpHeader()), ...(cookie ? { cookie } : {}) };
}
