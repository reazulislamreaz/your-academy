import { createHash } from 'crypto';

/** NFC + whitespace collapse + Latin casefold for duplicate detection (DEC-024). */
export function normalizeQuestionText(input: string): string {
  return input
    .normalize('NFC')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[A-Za-z]+/g, (m) => m.toLowerCase());
}

export function hashQuestionContent(input: string): string {
  return createHash('sha256').update(normalizeQuestionText(input), 'utf8').digest('hex');
}

export function hashFileBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function slugifyBatchCode(input: string): string {
  return input
    .normalize('NFC')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 64);
}
