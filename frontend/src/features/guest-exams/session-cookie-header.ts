import { cookies } from 'next/headers';

/**
 * Server-only: forward the visitor's cookies to the API so gated endpoints (PAID Model
 * Tests, DEC-060) can see the session. Returns no header for anonymous visitors.
 */
export async function sessionCookieHeader(): Promise<Record<string, string>> {
  const cookie = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
  return cookie ? { cookie } : {};
}
