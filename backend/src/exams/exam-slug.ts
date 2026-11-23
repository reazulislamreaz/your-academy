import { randomUUID } from 'crypto';

/**
 * URL-safe slug; keeps Unicode letters, digits and combining marks (\p{M}) so Bangla
 * vowel signs / hasanta survive — "চর্যাপদ" stays "চর্যাপদ", not "চর-য-পদ".
 */
export function slugifyExamTitle(name: string): string {
  const base = name
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
  return base || `exam-${randomUUID().slice(0, 8)}`;
}
