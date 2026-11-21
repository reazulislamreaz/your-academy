import { getCookie } from '@/lib/utils';

/**
 * Purge Next.js Data Cache + ISR for `/model-test` after guide CMS save.
 * Best-effort: Nest save already succeeded; cache lag is UX-only.
 */
export async function revalidateModelTestCache(): Promise<{ ok: boolean; detail?: string }> {
  try {
    const csrf = getCookie(process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? 'csrf_token');
    const res = await fetch('/api/revalidate/model-test', {
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
