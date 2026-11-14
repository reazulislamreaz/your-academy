import { createHash } from 'crypto';

/**
 * Strip simple HTML/formatting noise for duplicate comparison without
 * removing punctuation or mathematical symbols that change meaning.
 */
export function stripSimpleHtml(input: string): string {
  return input
    .replace(/<\s*br\s*\/?\s*>/gi, ' ')
    .replace(/<\s*\/\s*p\s*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function collapseComparableText(input: string): string {
  return stripSimpleHtml(input)
    .normalize('NFC')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[A-Za-z]+/g, (m) => m.toLowerCase());
}

/** NFC + HTML strip + whitespace collapse + Latin casefold (DEC-024). */
export function normalizeQuestionText(input: string): string {
  return collapseComparableText(input);
}

/** Same rules as question text — applied to correct-option content. */
export function normalizeAnswerText(input: string): string {
  return collapseComparableText(input);
}

/** Legacy: SHA-256 of normalized question text only (pre answer-aware detection). */
export function hashQuestionContent(input: string): string {
  return createHash('sha256').update(normalizeQuestionText(input), 'utf8').digest('hex');
}

/**
 * Identity hash for duplicate detection: normalized question + correct answer content.
 * Option letter/order does not matter — callers pass the correct option's text.
 */
export function hashQuestionIdentity(question: string, correctAnswerContent: string): string {
  const payload = [
    'qa:v1',
    normalizeQuestionText(question),
    normalizeAnswerText(correctAnswerContent),
  ].join('\n');
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

export function resolveCorrectOptionContent(
  correctLabel: string | null | undefined,
  options: { A?: string | null; B?: string | null; C?: string | null; D?: string | null },
): string {
  if (!correctLabel) return '';
  const key = correctLabel.toUpperCase() as 'A' | 'B' | 'C' | 'D';
  if (key !== 'A' && key !== 'B' && key !== 'C' && key !== 'D') return '';
  return options[key]?.toString() ?? '';
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

export function answerSnippet(answer: string, max = 60): string {
  const normalized = normalizeAnswerText(answer);
  if (!normalized) return '(empty)';
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}
