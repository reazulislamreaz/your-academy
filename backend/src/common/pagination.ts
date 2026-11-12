/**
 * Shared cursor-pagination helpers for Nest services.
 * Prefer `orderBy` with a unique tie-breaker (`id`) when using id cursors.
 */

export function parseLimit(
  raw: string | number | undefined,
  fallback = 20,
  max = 100,
): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), max);
}

/** Split a take:limit+1 query into page items + nextCursor (last item id). */
export function paginateById<T extends { id: string }>(
  rows: T[],
  limit: number,
): { items: T[]; nextCursor: string | null } {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  return {
    items,
    nextCursor: hasMore && last ? last.id : null,
  };
}
