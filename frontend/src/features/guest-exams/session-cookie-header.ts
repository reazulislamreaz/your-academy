import { cookies } from 'next/headers';

/**
 * Server-only: forward the visitor's cookies to the API so result endpoints can
 * resolve entitlement (DEC-051). Returns no header for anonymous visitors.
 */
export async function sessionCookieHeader(): Promise<Record<string, string>> {
  const cookie = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
  return cookie ? { cookie } : {};
}
