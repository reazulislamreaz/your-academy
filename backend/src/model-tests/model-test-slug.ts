import { randomUUID } from 'crypto';

/** URL-safe slug; keeps Unicode letters/digits for Bangla titles. */
export function slugifyModelTestTitle(name: string): string {
  const base = name
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
  return base || `model-test-${randomUUID().slice(0, 8)}`;
}
