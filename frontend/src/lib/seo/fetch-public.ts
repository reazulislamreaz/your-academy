import type { ApiPaginationMeta } from '@your-academy/shared';
import { serverApiBase, type ApiResult } from '@/lib/api/client';

/**
 * Server-side read of a public API object for metadata (title / description / JSON-LD).
 * Returns null on any failure so a page's <head> never breaks rendering.
 */
export async function fetchPublicData<T>(path: string, revalidate = 300): Promise<T | null> {
  try {
    const res = await fetch(`${serverApiBase()}${path}`, {
      next: { revalidate },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: T };
    return json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
}

/** First ~155 characters of plain text for a meta description. */
export function snippet(...parts: Array<string | null | undefined>): string | undefined {
  const text = parts
    .filter((p): p is string => Boolean(p && p.trim()))
    .join(' — ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return undefined;
  return text.length > 155 ? `${text.slice(0, 154).trimEnd()}…` : text;
}

/** Server-side read of one page of a public list (with pagination meta), null on failure. */
export async function fetchPublicList<T>(path: string, revalidate = 60): Promise<ApiResult<T[]> | null> {
  try {
    const res = await fetch(`${serverApiBase()}${path}`, {
      next: { revalidate },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      success?: boolean;
      data?: T[];
      meta?: { pagination?: ApiPaginationMeta };
    };
    if (!json.success || !Array.isArray(json.data)) return null;
    return { data: json.data, pagination: json.meta?.pagination };
  } catch {
    return null;
  }
}
