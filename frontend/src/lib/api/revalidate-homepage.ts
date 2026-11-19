import { getCookie } from '@/lib/utils';

/**
 * Purge Next.js Data Cache + ISR for homepage-tagged fetches.
 * Best-effort: publish already succeeded in Nest; cache lag is UX-only.
 */
export async function revalidateHomepageCache(): Promise<{ ok: boolean; detail?: string }> {
  try {
    const csrf = getCookie(process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? 'csrf_token');
    const res = await fetch('/api/revalidate/homepage', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      return {
        ok: false,
        detail: body?.error ?? `HTTP ${res.status}`,
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : 'Network error',
    };
  }
}
