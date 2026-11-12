import { randomUUID } from 'crypto';

/** URL-safe slug from display name; keeps Unicode letters/digits for Bangla names. */
export function slugifyCategoryName(name: string): string {
  const base = name
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  return base || `category-${randomUUID().slice(0, 8)}`;
}

export function nameKey(name: string): string {
  return name.normalize('NFC').trim().toLocaleLowerCase('bn');
}
