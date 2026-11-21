import { CategoryScope } from '@prisma/client';

export { CategoryScope };

export function parseCategoryScope(
  raw: string | undefined | null,
  fallback: CategoryScope = CategoryScope.PRELIMINARY,
): CategoryScope {
  const v = (raw ?? '').trim().toUpperCase();
  if (v === CategoryScope.WRITTEN) return CategoryScope.WRITTEN;
  if (v === CategoryScope.TOPIC) return CategoryScope.TOPIC;
  if (v === CategoryScope.PRELIMINARY) return CategoryScope.PRELIMINARY;
  return fallback;
}
